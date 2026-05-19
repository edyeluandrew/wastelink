const generateCode = (prefix) => {
  const suffix = String(Date.now()).slice(-4);
  return `${prefix}-${suffix}`;
};

export const generatePickerCode = () => generateCode("WL");
export const generateCollectionPointCode = () => generateCode("CP");
export const generateWasteJobCode = () => generateCode("JOB");
