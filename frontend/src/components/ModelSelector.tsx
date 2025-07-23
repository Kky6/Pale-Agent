import React from 'react';
import { Select } from 'antd';

interface ModelSelectorProps {
  value?: string;
  onChange: (value: string) => void;
  disabled?: boolean;
}

const ModelSelector: React.FC<ModelSelectorProps> = ({ value, onChange, disabled }) => {
  const models = [
    { label: 'Qwen2.5-72B-GeoGPT', value: 'Qwen2.5-72B-GeoGPT' },
    { label: 'GeoGPT-R1-Preview', value: 'GeoGPT-R1-Preview' },
    { label: 'DeepSeekR1-GeoGPT', value: 'DeepSeekR1-GeoGPT' },
  ];

  return (
    <Select
      style={{ width: 200 }}
      placeholder="选择模型"
      options={models}
      value={value}
      onChange={onChange}
      disabled={disabled}
    />
  );
};

export default ModelSelector;