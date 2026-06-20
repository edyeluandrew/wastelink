const generateCode = (prefix) => {
  const suffix = String(Date.now()).slice(-4);
  return `${prefix}-${suffix}`;
};

export const generatePickerCode = () => generateCode("WL");
export const generateCollectionPointCode = () => generateCode("CP");
export const generateWasteJobCode = () => generateCode("JOB");
export const generateBatchCode = () => generateCode("BATCH");
export const generatePurchaseRequestCode = () => generateCode("REQ");
