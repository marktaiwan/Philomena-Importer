
interface SettingBase {
  title: string;
  key: string;
  description?: string;
}

interface SettingCheckbox extends SettingBase {
  type: 'checkbox';
  defaultValue: boolean;
}

interface SettingText extends SettingBase {
  type: 'text';
  defaultValue: string;
}

interface SettingNumber extends SettingBase {
  type: 'number';
  defaultValue: number;
}

interface SettingSelection extends SettingBase {
  type: 'radio' | 'dropdown';
  defaultValue: string;
  selections: Array<{text: string, value: string}>;
}

interface FieldsetConfig {
  title: string;
  id: string;
}

interface ConfigObject {
  title: string;
  id: string;
  description: string;
  scriptId: string;
  pageElement: HTMLElement | null;
  parentElement: HTMLElement | null;

  addFieldset(
    title: string,
    id: string,
    fieldDescription?: string
  ): ConfigObject;

  registerSetting(
    config: SettingCheckbox | SettingText | SettingNumber | SettingSelection
  ): HTMLElement;

  setEntry(key: string, value: boolean | string | number): void;

  getEntry(key: string): boolean | string | number;

  deleteEntry(key: string): void;
}

declare function ConfigManager(
  scriptName: string,
  scriptId: string,
  scriptDescription?: string,
): ConfigObject
