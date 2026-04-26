import type { Ref } from 'vue';
import { computed, ref, watch } from 'vue';
import { $t } from '#/locales';
import { message } from 'ant-design-vue';

// 定义字段配置接口
export interface DisplayFieldConfig {
  key: string;
  label: string;
  visible: boolean;
}

/**
 * 可复用的显示字段配置管理
 * @param allDisplayFields 所有可用的字段配置（默认配置）
 * @param storageKey localStorage 的存储键名
 */
export function useDisplayFieldConfig(
  allDisplayFields: DisplayFieldConfig[],
  storageKey = 'order_fee_display_config',
) {
  // 从 localStorage 加载用户配置
  const loadUserConfig = (): DisplayFieldConfig[] => {
    try {
      const saved = localStorage.getItem(storageKey);

      if (saved) {
        const parsed = JSON.parse(saved);

        // 正确的合并策略：
        // 1. 以保存的配置为基础，保持其顺序
        // 2. 补充所有字段定义（包括新增字段）
        // 3. 对于已存在的字段，保留保存的 visible 状态

        const result: DisplayFieldConfig[] = [];
        const processedKeys = new Set<string>();

        // 第一步：按保存的顺序添加已配置的字段
        parsed.forEach((savedField: any) => {
          const fieldDef = allDisplayFields.find(
            (f) => f.key === savedField.key,
          );
          if (fieldDef) {
            // 使用保存的配置，但确保有完整的字段定义
            result.push({
              key: savedField.key,
              label: fieldDef.label, // 使用最新的 label（支持国际化更新）
              visible: savedField.visible,
            });
            processedKeys.add(savedField.key);
          }
        });

        // 第二步：添加新增的字段（之前不存在的字段）
        allDisplayFields.forEach((field) => {
          if (!processedKeys.has(field.key)) {
            result.push({ ...field });
          }
        });

        return result;
      }
    } catch (error) {
      console.error('加载用户配置失败:', error);
    }

    return [...allDisplayFields];
  };

  // 保存用户配置到 localStorage
  const saveUserConfig = (config: DisplayFieldConfig[]) => {
    try {
      localStorage.setItem(storageKey, JSON.stringify(config));
    } catch (error) {
      console.error('保存用户配置失败:', error);
    }
  };

  // 当前的显示字段配置
  const displayFieldConfig = ref<DisplayFieldConfig[]>(loadUserConfig());

  // 监听配置变化
  watch(
    displayFieldConfig,
    (newConfig) => {
      console.log('displayFieldConfig 发生变化:', newConfig.length, '个字段');
      console.log(
        '可见字段:',
        newConfig.filter((f) => f.visible).map((f) => f.key),
      );
    },
    { deep: true },
  );

  // 确认配置
  const handleConfigConfirm = async (newConfig: DisplayFieldConfig[]) => {
    displayFieldConfig.value = newConfig;
    saveUserConfig(newConfig);
    message.success($t('common.saveSuccess'));
  };

  return {
    displayFieldConfig,
    handleConfigConfirm,
    saveUserConfig,
  };
}
