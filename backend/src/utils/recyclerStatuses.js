export const BATCH_STATUSES = [
  'AVAILABLE',
  'RESERVED_PENDING_APPROVAL',
  'RESERVED',
  'PICKUP_SCHEDULED',
  'PICKED_UP',
  'SOLD',
  'CANCELLED',
  'PURCHASE_REQUESTED', // legacy
];

export const PURCHASE_REQUEST_STATUSES = [
  'PENDING',
  'APPROVED',
  'REJECTED',
  'CANCELLED',
  'COMPLETED',
];

export const RECYCLER_STATUSES = ['ACTIVE', 'INACTIVE'];

export const PAYMENT_STATUSES = ['PENDING', 'RECEIVED'];

export const isBatchAvailableForPurchase = (status) =>
  status === 'AVAILABLE' || status === 'RESERVED_PENDING_APPROVAL';

export default {
  BATCH_STATUSES,
  PURCHASE_REQUEST_STATUSES,
  RECYCLER_STATUSES,
  PAYMENT_STATUSES,
  isBatchAvailableForPurchase,
};
