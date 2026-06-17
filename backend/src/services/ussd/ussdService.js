import { parseUssdPath } from '../../utils/ussdTextParser.js';
import { normalizePhoneNumber, getShortPhoneFormat } from '../../utils/phone.js';
import {
  findPickerByPhone,
  registerPickerFromUssd,
  getActiveWasteTypesForPicker,
  getCollectionPointsByDivision,
  getRecentWasteLogsForPicker,
  createUssdWasteLog,
  DIVISIONS,
} from './ussdPickerService.js';
import { getWithdrawalBalance, createPickerWithdrawal } from '../payment/withdrawalService.js';
import { detectMobileProvider } from '../../utils/mobileMoney.js';

const HELP_PHONE = process.env.USSD_HELP_PHONE || '';

export const generateMainMenu = () =>
  `CON WasteLink Uganda
1. Register
2. Log Waste
3. Job Status
4. Earnings
5. Withdraw
6. Collection Points
7. Help`;

const formatUgx = (amount) => `UGX ${parseInt(amount || 0, 10).toLocaleString('en-UG')}`;

const statusLabel = (status) => {
  switch (String(status || '').toUpperCase()) {
    case 'PENDING':
      return 'Pending';
    case 'VERIFIED':
      return 'Verified';
    case 'REJECTED':
      return 'Rejected';
    case 'PAID':
      return 'Paid';
    default:
      return status || 'Unknown';
  }
};

const requireRegisteredPicker = async (phoneNumber) => {
  const picker = await findPickerByPhone(phoneNumber);
  if (!picker || picker.status !== 'ACTIVE') {
    return { error: 'END Please register first by dialing again and selecting 1.' };
  }
  return { picker };
};

const handleRegister = async (parts, phoneNumber) => {
  if (parts.length === 1) {
    const existing = await findPickerByPhone(phoneNumber);
    if (existing) {
      return 'END You are already registered on WasteLink.';
    }
    return 'CON Enter your full name:';
  }

  if (parts.length === 2) {
    const name = parts[1]?.trim();
    if (!name || name.length < 2) {
      return 'END Name is required. Please dial again and register.';
    }
    return `CON Select city/division:
1. Kampala
2. Jinja
3. Gulu
4. Other`;
  }

  if (parts.length === 3) {
    if (!['1', '2', '3', '4'].includes(parts[2])) {
      return 'END Invalid city option. Please dial again.';
    }
    return 'CON Enter your area/location:';
  }

  if (parts.length === 4) {
    const area = parts[3]?.trim();
    if (!area) {
      return 'END Area/location is required. Please dial again.';
    }
    const displayPhone = getShortPhoneFormat(phoneNumber);
    return `CON Confirm phone for payments (${displayPhone})?
1. Yes
2. Cancel`;
  }

  if (parts.length === 5) {
    if (parts[4] === '2') {
      return 'END Registration cancelled.';
    }
    if (parts[4] !== '1') {
      return 'END Invalid option. Please dial again.';
    }

    const result = await registerPickerFromUssd({
      phoneNumber,
      name: parts[1],
      cityKey: parts[2],
      area: parts[3],
    });

    if (result.error === 'ALREADY_REGISTERED') {
      return 'END You are already registered on WasteLink.';
    }
    if (result.error === 'INVALID_NAME') {
      return 'END Name is required. Please dial again.';
    }

    return 'END Registration successful. You can now log waste with WasteLink.';
  }

  return 'END Invalid registration step. Please dial again.';
};

const buildWasteTypeMenu = (types) => {
  let menu = 'CON Select waste type:\n';
  types.forEach((type, index) => {
    menu += `${index + 1}. ${type.name}\n`;
  });
  menu += '0. Back';
  return menu.trimEnd();
};

const buildCollectionPointMenu = (points, division) => {
  let menu = `CON Select collection point (${division}):\n`;
  points.forEach((point, index) => {
    const shortName = point.name.length > 22 ? `${point.name.slice(0, 20)}..` : point.name;
    menu += `${index + 1}. ${shortName}\n`;
  });
  menu += '0. Back';
  return menu.trimEnd();
};

const handleLogWaste = async (parts, phoneNumber) => {
  const auth = await requireRegisteredPicker(phoneNumber);
  if (auth.error) return auth.error;
  const { picker } = auth;

  const types = await getActiveWasteTypesForPicker(picker);

  if (parts.length === 1) {
    if (types.length === 0) {
      return 'END No waste types available for your city. Contact support.';
    }
    return buildWasteTypeMenu(types);
  }

  const typeIndex = parseInt(parts[1], 10) - 1;
  if (parts.length === 2) {
    if (!Number.isFinite(typeIndex) || typeIndex < 0 || typeIndex >= types.length) {
      return 'END Invalid waste type. Please dial again.';
    }
    return 'CON Enter estimated weight in kg:';
  }

  if (parts.length === 3) {
    const kg = parseFloat(parts[2]);
    if (!Number.isFinite(kg) || kg <= 0) {
      return 'END Weight must be greater than 0 kg.';
    }
    return `CON Select division:
1. Kawempe
2. Central
3. Nakawa
4. Makindye
5. Rubaga`;
  }

  if (parts.length === 4) {
    const division = DIVISIONS[parts[3]];
    if (!division) {
      return 'END Invalid division. Please dial again.';
    }
    const points = await getCollectionPointsByDivision(division);
    if (points.length === 0) {
      return `END No collection points in ${division}. Try another division.`;
    }
    return buildCollectionPointMenu(points, division);
  }

  if (parts.length === 5) {
    const kg = parseFloat(parts[2]);
    const typeIndexVal = parseInt(parts[1], 10) - 1;
    const division = DIVISIONS[parts[3]];
    const pointIndex = parseInt(parts[4], 10) - 1;

    if (!division) return 'END Invalid division.';
    const points = await getCollectionPointsByDivision(division);
    if (!Number.isFinite(pointIndex) || pointIndex < 0 || pointIndex >= points.length) {
      return 'END Invalid collection point.';
    }

    const selectedType = types[typeIndexVal];
    if (!selectedType) return 'END Invalid waste type.';

    const created = await createUssdWasteLog({
      pickerId: picker.id,
      cityWasteTypeId: selectedType.id,
      estimatedKg: kg,
      collectionPointId: points[pointIndex].id,
      phoneNumber,
    });

    if (created.error) {
      return 'END Could not log waste. Please try again later.';
    }

    return `END Waste logged successfully. Job ${created.wasteLog.job_code}. Agent will verify before earnings become withdrawable.`;
  }

  return 'END Invalid option. Please dial again.';
};

const handleJobStatus = async (parts, phoneNumber) => {
  const auth = await requireRegisteredPicker(phoneNumber);
  if (auth.error) return auth.error;

  const logs = await getRecentWasteLogsForPicker(auth.picker.id, 5);
  if (logs.length === 0) {
    return 'END No waste logs found. Select Log Waste to submit your first waste.';
  }

  let message = 'END Recent Waste Logs:\n';
  logs.forEach((log, index) => {
    const label = log.city_waste_type_name || log.waste_type;
    const kg = log.verified_kg || log.estimated_kg || 0;
    message += `${index + 1}. ${label} ${kg}kg - ${statusLabel(log.status)}\n`;
  });

  return message.trimEnd();
};

const handleEarnings = async (parts, phoneNumber) => {
  const auth = await requireRegisteredPicker(phoneNumber);
  if (auth.error) return auth.error;

  const balance = await getWithdrawalBalance(auth.picker.id);

  let message = `END WasteLink Earnings
Available: ${formatUgx(balance.available_balance)}
Processing: ${formatUgx(balance.payout_processing_balance)}
Paid: ${formatUgx(balance.total_paid)}`;

  if (balance.failed_balance > 0) {
    message += `\nFailed: ${formatUgx(balance.failed_balance)}`;
  }

  if (balance.pending_logs_count > 0) {
    message += `\nPending verification: ${balance.pending_logs_count} job(s)`;
  }

  return message;
};

const handleWithdraw = async (parts, phoneNumber) => {
  const auth = await requireRegisteredPicker(phoneNumber);
  if (auth.error) return auth.error;
  const { picker } = auth;

  const balance = await getWithdrawalBalance(picker.id);
  const available = balance.available_balance || 0;

  if (parts.length === 1) {
    if (available <= 0) {
      return 'END You have no withdrawable balance yet. Earnings become available after agent verification.';
    }
    return `CON Available balance: ${formatUgx(available)}
Enter amount to withdraw:`;
  }

  if (parts.length === 2) {
    const amount = parseInt(parts[1], 10);
    if (!Number.isFinite(amount) || amount <= 0) {
      return 'END Enter a valid amount greater than 0.';
    }
    if (amount > available) {
      return 'END Insufficient balance.';
    }
    const displayPhone = normalizePhoneNumber(phoneNumber);
    return `CON Withdraw ${formatUgx(amount)} to ${displayPhone}?
1. Confirm
2. Cancel`;
  }

  if (parts.length === 3) {
    if (parts[2] === '2') {
      return 'END Withdrawal cancelled.';
    }
    if (parts[2] !== '1') {
      return 'END Invalid option. Please dial again.';
    }

    const amount = parseInt(parts[1], 10);
    const latestBalance = await getWithdrawalBalance(picker.id);
    const latestAvailable = latestBalance.available_balance || 0;

    if (!Number.isFinite(amount) || amount <= 0) {
      return 'END Invalid amount.';
    }
    if (amount > latestAvailable) {
      return 'END Insufficient balance.';
    }

    try {
      const provider = detectMobileProvider(phoneNumber) || 'MTN';
      await createPickerWithdrawal({
        pickerId: picker.id,
        provider,
        phone: phoneNumber,
        amount,
        changedBy: null,
      });
      return 'END Withdrawal request received. Payment is being processed.';
    } catch (error) {
      if (error.message?.includes('Insufficient') || error.message?.includes('exceeds')) {
        return 'END Insufficient balance.';
      }
      return 'END Withdrawal failed. Please try again later.';
    }
  }

  return 'END Invalid option. Please dial again.';
};

const handleCollectionPoints = async (parts) => {
  if (parts.length === 1) {
    return `CON Select division:
1. Kawempe
2. Central
3. Nakawa
4. Makindye
5. Rubaga`;
  }

  if (parts.length === 2) {
    const division = DIVISIONS[parts[1]];
    if (!division) {
      return 'END Invalid division. Please dial again.';
    }

    const points = await getCollectionPointsByDivision(division);
    if (points.length === 0) {
      return `END No active collection points in ${division}.`;
    }

    let message = `END ${division} Points:\n`;
    points.forEach((point, index) => {
      message += `${index + 1}. ${point.name}\n`;
    });
    return message.trimEnd();
  }

  return 'END Invalid option. Please dial again.';
};

const handleHelp = () => {
  if (HELP_PHONE) {
    return `END WasteLink Help:
Register, log waste, wait for agent verification, then withdraw earnings. For help call: ${HELP_PHONE}`;
  }
  return `END WasteLink Help:
Register, log waste, wait for agent verification, then withdraw earnings. Contact your city agent or WasteLink support.`;
};

export const routeUssdRequest = async (text, phoneNumber) => {
  const { parts, isMainMenu } = parseUssdPath(text);

  if (isMainMenu) {
    return generateMainMenu();
  }

  const root = parts[0];

  switch (root) {
    case '1':
      return handleRegister(parts, phoneNumber);
    case '2':
      return handleLogWaste(parts, phoneNumber);
    case '3':
      return handleJobStatus(parts, phoneNumber);
    case '4':
      return handleEarnings(parts, phoneNumber);
    case '5':
      return handleWithdraw(parts, phoneNumber);
    case '6':
      return handleCollectionPoints(parts);
    case '7':
      return handleHelp();
    default:
      return 'END Invalid option. Please dial again and choose a valid menu item.';
  }
};

export default {
  generateMainMenu,
  routeUssdRequest,
};
