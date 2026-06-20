export const BATCH_STATUSES = [
  'AVAILABLE',
  'RESERVED',
  'PURCHASE_REQUESTED',
  'PICKUP_SCHEDULED',
  'PICKED_UP',
  'SOLD',
  'CANCELLED',
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

export const isBatchAvailableForPurchase = (status) => status === 'AVAILABLE';

export default {
  BATCH_STATUSES,
  PURCHASE_REQUEST_STATUSES,
  RECYCLER_STATUSES,
  PAYMENT_STATUSES,
  isBatchAvailableForPurchase,
};
