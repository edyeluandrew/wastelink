import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

const updates = {
  'frontend/src/picker/components/PickerTopbar.jsx': import { useNavigate } from 'react-router-dom';
import { Link as LinkIcon } from 'lucide-react';
import { clearPickerSession } from '../utils/pickerSession';

export default function PickerTopbar({ picker }) {
  const navigate = useNavigate();

  const handleSwitchPicker = () => {
    clearPickerSession();
    navigate('/picker/start');
  };

  return (
    <div className=" bg-white border-b border-gray-300 sticky top-0 z-40>
