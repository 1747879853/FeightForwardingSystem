<script lang="ts" setup>
import {
  computed,
  nextTick,
  onMounted,
  ref,
  watch,
  markRaw,
  h,
  defineComponent,
} from 'vue';
import { useRoute, useRouter } from 'vue-router';

import { Page } from '@vben/common-ui';

import {
  Button,
  Card,
  Form,
  FormItem,
  Input,
  message,
  Modal,
  Space,
  Spin,
  Checkbox,
  CheckboxGroup,
  Tag,
} from 'ant-design-vue';
import type { SystemUserAdminApi } from '#/api/system/user-admin';

import { useVbenForm } from '#/adapter/form';
import { getAreaAndParents } from '#/api/common/area';
import AddressModal from './address-modal.vue';
import RiskbirdSearchModal from './riskbird-search-modal.vue';
import PaymentTermsPanel from '../payment-terms/list.vue';
import OrgSharedLabel from './org-shared-label.vue';
import { ClientSharedType, normalizeClientSharedType } from './shared-type';
import { useVbenModal } from '@vben/common-ui';
import { useUserStore } from '@vben/stores';
import { ClientAdminApi } from '#/api/sea-export/client-admin';
import { getUser, UserAttribute, UserStatus } from '#/api/system/user-admin';
import dayjs from 'dayjs';
import { pinyin } from 'pinyin-pro';
import {
  FileText,
  IconifyIcon,
  MapPin,
  Package,
  Save,
  Ship,
  Users,
  Plus,
  Search,
} from '@vben/icons';
import {
  addClient,
  auditClient,
  editClient,
  getClientAuditDetail,
  getClientDetail,
  addDishonest,
  cancelDishonest,
  modifyClientAudit,
  submitClientAudit,
  withdrawClientAudit,
} from '#/api/sea-export/client-admin';
import { useClientAuditConfig } from '#/composables/use-client-audit-config';
import {
  canApplyClientModify,
  canEditClient,
  canSubmitClientAudit,
  canWithdrawClientAudit,
  getClientStatusLabel,
  ClientStatus,
} from './client-status';
import {
  type AuditChangedSections,
  computeAuditModifyChanges,
} from './audit-modify-highlight';
import { $t } from '#/locales';
import { useTabs } from '@vben/hooks';
import { useUnsavedGuard } from '#/composables/use-unsaved-guard';
import { markListShouldRefresh } from '#/utils/list-refresh-flag';
import { setFormApisDisabled } from '#/utils/ticket-editable';
import { openAuditRemarkConfirm } from '#/views/audit-approval/composables/use-audit-remark-confirm';
import { findMyPendingWorkFlowItemId } from '#/views/audit-approval/client-review/find-pending-item';
import ApprovalPath from '#/views/audit-approval/client-review/modules/approval-path.vue';
import TransferModal from '#/views/audit-approval/client-review/modules/transfer-modal.vue';
import type { SeaExportAdminApi } from '#/api/sea-export/sea-export-admin';
import {
  useBaseFormSchema,
  useBusinessFormSchema,
  useClientFormSchema,
  useSupplierFormSchema,
} from './data';
import * as ClientConstants from './data';
import UserSelect from '#/adapter/component/biz-select/user-select.vue';
import type { RiskbirdApi } from '#/api/riskbird/riskbird';

defineOptions({ name: 'ClientAdminForm' });

const props = withDefaults(defineProps<{ embedded?: boolean }>(), {
  embedded: false,
});

const route = useRoute();
const router = useRouter();
const { closeTabByKey } = useTabs();
const userStore = useUserStore();

const editId = computed<string | undefined>(() => {
  const id = route.params.id;
  if (Array.isArray(id)) return id[0];
  return id ? String(id) : undefined;
});

const isEdit = computed(() => !!editId.value);

/** 租户启用客户审核时才按 clientStatus 卡编辑/申请修改 */
const { auditEnabled } = useClientAuditConfig();

/** 页内点「申请修改」切换出口，不改路由，省去标签与离开守卫的干扰 */
const modifyModeOverride = ref(false);

/** 申请修改模式：复用同一套编辑 UI，提交走 ModifyAuditAsync 并多带申请原因 */
const isModifyMode = computed(
  () =>
    isEdit.value && (modifyModeOverride.value || route.query.mode === 'modify'),
);

/** 客户审核列表双击进入：只读 + 右上角仅审核操作 */
const isAuditMode = computed(
  () => isEdit.value && route.query.mode === 'audit',
);

const { ClientTaskStatus, ClientTaskType } = ClientAdminApi;

const auditDetail = ref<ClientAdminApi.ClientAuditDetailDto | null>(null);
const auditSubmitting = ref(false);
const changedAuditFields = ref<Set<string>>(new Set());
const changedAuditSections = ref<AuditChangedSections>({
  addresses: false,
  billingPeriods: false,
  industry: false,
  stakeholders: false,
  type: false,
});

const canPendingAudit = computed(
  () =>
    isAuditMode.value &&
    auditDetail.value?.myTaskStatus === ClientTaskStatus.Auditing,
);

const canPostRejectAudit = computed(
  () =>
    isAuditMode.value &&
    auditDetail.value?.taskStatus === ClientTaskStatus.Passed &&
    auditDetail.value?.myTaskStatus === ClientTaskStatus.Passed,
);

const auditActionCode = 'Admin.Client.Audit';

const clientStatus = ref<ClientAdminApi.ClientStatus | undefined>();

/** 可直接编辑：未提交(0)/已驳回(3)；其余状态只能走申请修改 */
const canDirectEdit = computed(
  () => !auditEnabled.value || canEditClient(clientStatus.value),
);

/** 已通过(2)/申请修改驳回(5) 可发起申请修改 */
const canApplyModify = computed(() => canApplyClientModify(clientStatus.value));

/** 未提交(0)/已驳回(3) 可从编辑页提交审核 */
const canSubmitAudit = computed(() => canSubmitClientAudit(clientStatus.value));

/**
 * 撤销提交：新增客户待审核(1)。
 * 取消申请修改：申请修改进行中(4)。
 * 均走 WithdrawAuditAsync（与列表「撤回」同一接口），只撤最新一轮。
 */
const canWithdrawSubmit = computed(
  () =>
    auditEnabled.value &&
    clientStatus.value === ClientStatus.Auditing &&
    canWithdrawClientAudit(clientStatus.value),
);

const canCancelModifyApply = computed(
  () =>
    auditEnabled.value &&
    clientStatus.value === ClientStatus.ModifyAuditing &&
    canWithdrawClientAudit(clientStatus.value),
);

/** 已通过 / 申请修改驳回等不可直接改的状态，点「申请修改」后才放开编辑；审核模式始终只读 */
const formLocked = computed(() => {
  if (isAuditMode.value) return true;
  if (!isEdit.value || !auditEnabled.value || isModifyMode.value) return false;
  if (clientStatus.value === undefined) return false;
  return !canDirectEdit.value;
});
const canSaveClient = computed(() => {
  if (!isEdit.value) return true;
  // 详情还没回来时不提前拦，避免一进页面就闪一条状态提示；后端另有兜底校验
  if (clientStatus.value === undefined) return true;
  return isModifyMode.value ? canApplyModify.value : canDirectEdit.value;
});

const clientStatusTagColor = computed(() => {
  const status = clientStatus.value;
  if (status === undefined) return 'default';
  if (canDirectEdit.value) return 'default';
  return canApplyModify.value ? 'success' : 'processing';
});

/** 停在同一个编辑页切到申请修改模式，只换提交出口，表单已填内容不丢 */
const enterModifyMode = () => {
  modifyModeOverride.value = true;
};

/** 未提交/已驳回的客户从编辑页提交审核；未保存的改动不带进审核 */
const handleSubmitAudit = async () => {
  const id = editId.value;
  if (!id || !canSubmitAudit.value) return;
  if (await isFormDirty()) {
    message.warning('请先保存客户信息，再提交审核');
    return;
  }
  Modal.confirm({
    title: '提交审核',
    content: '确定提交当前客户进入审核流程吗？一条客户生成一个独立审批任务。',
    okText: $t('common.confirm'),
    cancelText: $t('common.cancel'),
    async onOk() {
      await submitClientAudit({ ids: [id] });
      message.success('已提交审核');
      markListShouldRefresh('ClientList');
      await loadEditData();
    },
  });
};

/** 新增客户待审核：撤销提交（撤回最新一轮 SubmitClient 任务） */
const handleWithdrawSubmit = () => {
  const id = editId.value;
  if (!id || !canWithdrawSubmit.value) return;
  Modal.confirm({
    title: '撤销提交',
    content:
      '确定撤销当前客户的审核提交吗？仅撤回最新一轮，历史审批留档；撤销后可继续编辑并重新提交。',
    okText: $t('common.confirm'),
    cancelText: $t('common.cancel'),
    okType: 'danger',
    async onOk() {
      await withdrawClientAudit({ ids: [id] });
      message.success('已撤销提交');
      markListShouldRefresh('ClientList');
      await loadEditData();
    },
  });
};

/** 申请修改进行中：取消申请（撤回最新一轮 ModifyClient 任务） */
const handleCancelModifyApply = () => {
  const id = editId.value;
  if (!id || !canCancelModifyApply.value) return;
  Modal.confirm({
    title: '取消申请',
    content:
      '确定取消当前的申请修改吗？仅撤回最新一轮，历史审批留档；取消后客户恢复为可再次申请修改的状态。',
    okText: $t('common.confirm'),
    cancelText: $t('common.cancel'),
    okType: 'danger',
    async onOk() {
      await withdrawClientAudit({ ids: [id] });
      message.success('已取消申请修改');
      modifyModeOverride.value = false;
      markListShouldRefresh('ClientList');
      await loadEditData();
    },
  });
};

const clientStatusHint = computed(() => {
  if (canSaveClient.value) return '';
  const label = getClientStatusLabel(clientStatus.value);
  if (isModifyMode.value) {
    return `客户当前为${label}，不可发起申请修改`;
  }
  if (clientStatus.value === ClientStatus.Auditing) {
    return `客户当前为${label}，不可编辑，可撤销提交后修改`;
  }
  if (clientStatus.value === ClientStatus.ModifyAuditing) {
    return `客户当前为${label}，审核进行中，可取消申请`;
  }
  return `客户当前为${label}，不可直接编辑，请发起申请修改`;
});

type SectionKey = 'basic' | 'party' | 'shipment' | 'port' | 'cargo';
const sectionRefs = {
  basic: ref<HTMLElement | null>(null),
  shipment: ref<HTMLElement | null>(null),
  port: ref<HTMLElement | null>(null),
  cargo: ref<HTMLElement | null>(null),
  party: ref<HTMLElement | null>(null),
} as const;
const currentSection = ref<SectionKey>('basic');
const pageLoading = ref(false);
const submitting = ref(false);
const isCustomerType = ref<number[]>();
const isSupplierType = ref<number[]>();
const isClient = ref<boolean>(false);
const isSupplier = ref<boolean>(false);
const customerType = ref<string[]>();
const supplierType = ref<string[]>();
const isDishonest = ref<boolean>(false); // 客户失信状态

const getOrderUserRoleLabel = (userAttribute?: number) => {
  switch (userAttribute) {
    case UserAttribute.Sales:
      return $t('seaExport.client.stakeholdersOptions.salesPerson');
    case UserAttribute.Operation:
      return $t('seaExport.client.stakeholdersOptions.operationPersonnel');
    case UserAttribute.CustomerService:
      return $t('seaExport.client.stakeholdersOptions.customerSupport');
    case UserAttribute.Documentation:
      return $t('seaExport.client.stakeholdersOptions.documentClerk');
    default:
      return '-';
  }
};

const getOrderUserRoleIcon = (userAttribute?: number) => {
  switch (userAttribute) {
    case UserAttribute.Sales:
      return 'mdi:account-tie-outline';
    case UserAttribute.Operation:
      return 'mdi:cog-outline';
    case UserAttribute.CustomerService:
      return 'mdi:headset';
    case UserAttribute.Documentation:
      return 'mdi:file-document-outline';
    default:
      return 'mdi:account-outline';
  }
};

const getStakeholderCount = (item: {
  userIds?: number[];
  stakeholderList?: unknown[];
}) => item.userIds?.length ?? item.stakeholderList?.length ?? 0;
const defaultOrderUsers = ref<ClientAdminApi.ClientStakeholderListDto[]>([
  { userAttribute: UserAttribute.Sales, stakeholderList: [] },
  { userAttribute: UserAttribute.Operation, stakeholderList: [] },
  { userAttribute: UserAttribute.CustomerService, stakeholderList: [] },
  { userAttribute: UserAttribute.Documentation, stakeholderList: [] },
]);

/**
 * 详情已带 userNickName 时立刻交给 UserSelect 回显，
 * 避免等全量用户缓存时先闪数字 id（TAPD #1000544）。
 */
const toUserSelectSelectedItems = (
  list?: Array<{ userId?: number; userNickName?: string }> | null,
): SystemUserAdminApi.UserSimpleDto[] => {
  if (!list?.length) return [];
  return list
    .filter((item) => item.userId != null && String(item.userId) !== '')
    .map((item) => {
      const nickName = (item.userNickName ?? '').trim();
      return {
        id: item.userId as number,
        nickName,
      };
    })
    .filter((item) => item.nickName);
};

/** 对账人用户ID列表 */
const reconcilerUserIds = ref<number[]>([]);
/** 对账人列表（带详细信息） */
const reconcilerList = ref<ClientAdminApi.ClientReconcilerDto[]>([]);

/**
 * 从字符串中提取首字母（用于生成客户代码）
 * 支持中文转拼音、英文和数字
 * @param str 输入字符串
 * @returns 提取的首字母字符串（大写）
 */
const getFirstLetters = (str: string): string => {
  if (!str) return '';

  // 移除空格和特殊字符，只保留中文、英文、数字
  const cleanStr = str.replace(/[^\u4e00-\u9fa5a-zA-Z0-9]/g, '');
  let result = '';

  for (let i = 0; i < cleanStr.length; i++) {
    const char = cleanStr[i];
    if (!char) continue;

    // 如果是中文字符，使用pinyin-pro转换为拼音首字母
    if (/[\u4e00-\u9fa5]/.test(char)) {
      // 获取拼音（无声调），取第一个字母并转为大写
      const py = pinyin(char, { toneType: 'none' });
      if (py && py.length > 0) {
        result += py.charAt(0).toUpperCase();
      }
    } else if (/[a-zA-Z0-9]/.test(char)) {
      // 英文字母取大写，数字直接保留
      result += char.toUpperCase();
    }

    // 限制长度，避免代码过长（最多8个字符）
    if (result.length >= 8) break;
  }

  return result;
};

const [BaseForm, baseFormApi] = useVbenForm({
  layout: 'vertical',
  schema: useBaseFormSchema(),
  showDefaultActions: false,
  wrapperClass: 'grid-cols-4',
});

/** 共享类型：UI 挂在所属公司标题右侧，值写入基础表单 isShared */
const isSharedValue = ref(ClientSharedType.None);

function bindOrgSharedLabel() {
  baseFormApi.updateSchema([
    {
      fieldName: 'orgId',
      labelClass: 'w-full',
      label: markRaw(
        defineComponent({
          name: 'ClientOrgSharedLabelBinder',
          setup() {
            return () =>
              h(OrgSharedLabel, {
                value: isSharedValue.value,
                disabled: formLocked.value,
                'onUpdate:value': async (value: ClientSharedType) => {
                  if (formLocked.value) return;
                  isSharedValue.value = value;
                  await baseFormApi.setFieldValue('isShared', value);
                },
              });
          },
        }),
      ),
    },
  ]);
}

const [BusinessForm, businessFormApi] = useVbenForm({
  layout: 'vertical',
  schema: useBusinessFormSchema(),
  showDefaultActions: false,
  wrapperClass: 'grid-cols-2',
});

const [ClientForm, clientFormApi] = useVbenForm({
  layout: 'vertical',
  schema: useClientFormSchema(),
  showDefaultActions: false,
  wrapperClass: 'grid-cols-4',
});

const [SupplierForm, supplierFormApi] = useVbenForm({
  layout: 'vertical',
  schema: useSupplierFormSchema(),
  showDefaultActions: false,
  wrapperClass: 'grid-cols-3',
});

watch(
  formLocked,
  (locked) => {
    setFormApisDisabled(
      [baseFormApi, businessFormApi, clientFormApi, supplierFormApi],
      locked,
    );
  },
  { immediate: true },
);

const [AddressModalComponent, modalApi] = useVbenModal({
  // 连接抽离的组件
  connectedComponent: AddressModal,
});

/** 风鸟企业查询弹窗 */
const [RiskbirdModal, riskbirdModalApi] = useVbenModal({
  connectedComponent: RiskbirdSearchModal,
});

/** 客户审核转交（登录即可，不挂 Admin.Client.Audit） */
const [TransferModalComp, transferModalApi] = useVbenModal({
  connectedComponent: TransferModal,
  destroyOnClose: true,
});

/** 用于存储当前的客户全称，用于 watch 监听 */
const currentFullName = ref<string>('');

/**
 * 解析风鸟日期（兼容毫秒/秒时间戳与日期字符串）
 */
const parseRiskbirdDate = (dateValue: any): string => {
  if (!dateValue) return '';

  // 如果是数字类型的时间戳
  if (typeof dateValue === 'number') {
    // 判断是毫秒还是秒（大于10位通常是毫秒）
    const timestamp = dateValue > 9999999999 ? dateValue : dateValue * 1000;
    const date = dayjs(timestamp);
    return date.isValid() ? date.format('YYYY-MM-DD') : '';
  }

  // 如果是字符串
  if (typeof dateValue === 'string') {
    // 尝试解析为日期
    const date = dayjs(dateValue);
    if (date.isValid()) {
      return date.format('YYYY-MM-DD');
    }

    // 尝试作为数字时间戳解析
    const numValue = Number(dateValue);
    if (!isNaN(numValue)) {
      const timestamp = numValue > 9999999999 ? numValue : numValue * 1000;
      const parsedDate = dayjs(timestamp);
      return parsedDate.isValid() ? parsedDate.format('YYYY-MM-DD') : '';
    }
  }

  return '';
};

/**
 * 格式化营业期限
 */
const formatBusinessTerm = (
  opFrom: number | undefined,
  opTo: number | undefined,
): string => {
  if (!opFrom && !opTo) return '';

  const fromDate = parseRiskbirdDate(opFrom);
  const toDate = opTo ? parseRiskbirdDate(opTo) : '长期';

  if (fromDate) {
    return `${fromDate} 至 ${toDate}`;
  }

  return '';
};

/**
 * 打开风鸟企业查询弹窗
 */
const openRiskbirdSearch = async () => {
  if (formLocked.value) return;
  // 获取当前表单中的全称
  const values = await baseFormApi.getValues();
  const fullName = values.fullName;

  if (!fullName) {
    message.warning('请先输入客户全称');
    return;
  }

  // 设置搜索关键字为当前全称，并传入clientId（编辑模式用于回写）

  riskbirdModalApi
    .setData({
      searchKeyword: fullName, // 传递搜索关键字
      clientId: editId.value, // 编辑模式传入clientId用于回写
    })
    .open();
};

/**
 * 处理从风鸟导入的数据
 */
const handleRiskbirdImport = async (
  detail: RiskbirdApi.RiskbirdCompanyDetailDto,
) => {
  try {
    // 构建要更新的字段
    const updateData: Record<string, any> = {};

    // 1. 统一社会信用代码 -> taxNo（新字段：creditCode）
    if (detail.creditCode) {
      updateData.taxNo = detail.creditCode;
    } else if (detail.uniscid) {
      // 兼容旧字段
      updateData.taxNo = detail.uniscid;
    }

    // 2. 法定代表人 -> legalPerson（新字段：legalPerson）
    if (detail.legalPerson) {
      updateData.legalPerson = detail.legalPerson;
    } else if (detail.personName) {
      // 兼容旧字段
      updateData.legalPerson = detail.personName;
    }

    // 3. 注册资本 -> registeredCapital（新字段：raw.regCap）
    if (detail.raw?.regCap) {
      updateData.registeredCapital = detail.raw.regCap;
    } else if (detail.regConcat) {
      // 兼容旧字段
      updateData.registeredCapital = detail.regConcat;
    }

    // 4. 成立日期 -> establishmentDate（新字段：raw.esDate）
    const esDate = detail.raw?.esDate || detail.esDate;
    if (esDate) {
      const establishmentDate = parseRiskbirdDate(esDate);
      if (establishmentDate) {
        updateData.establishmentDate = dayjs(establishmentDate);
      }
    }

    // 5. 营业期限 -> businessTerm（新字段：operateFrom/operateTo）
    const operateFrom = detail.operateFrom;
    const operateTo = detail.operateTo;
    if (operateFrom || operateTo) {
      // operateFrom和operateTo已经是日期字符串格式（如"2018-10-29"），不需要parseInt
      const fromDate = operateFrom
        ? dayjs(operateFrom).format('YYYY-MM-DD')
        : '';
      const toDate =
        operateTo && operateTo !== '长期'
          ? dayjs(operateTo).format('YYYY-MM-DD')
          : '长期';

      if (fromDate) {
        const businessTerm = `${fromDate} 至 ${toDate}`;
        updateData.businessTerm = businessTerm;
      }
    }

    // 6. 注册地址 -> address（新字段：address）
    if (detail.address) {
      updateData.address = detail.address;
    } else if (detail.dom || detail.regAddr) {
      // 兼容旧字段
      updateData.address = detail.dom || detail.regAddr;
    }

    // 7. 英文名称 -> enName
    if (detail.raw?.entNameEn || detail.enterpriseNameEng) {
      updateData.enName = detail.raw?.entNameEn || detail.enterpriseNameEng;
    }

    // 8. 电话 -> phone（新字段：phone）
    if (detail.phone) {
      updateData.phone = detail.phone;
    } else if (detail.tel) {
      // 兼容旧字段
      updateData.phone = detail.tel;
    }

    // 9. 官网 -> url
    if (detail.website) {
      updateData.url = detail.website;
    }

    // 10. 邮箱 -> email
    if (detail.email) {
      updateData.email = detail.email;
    }

    // 11. 名称 -> name
    if (detail.name) {
      //updateData.name = detail.name;
      updateData.fullName = detail.name; // 同步更新全称
    }

    // 更新基础信息表单
    if (Object.keys(updateData).length > 0) {
      await baseFormApi.setValues(updateData);

      // 更新业务信息表单
      const businessUpdateData: Record<string, any> = {};
      if (updateData.legalPerson)
        businessUpdateData.legalPerson = updateData.legalPerson;
      if (updateData.registeredCapital)
        businessUpdateData.registeredCapital = updateData.registeredCapital;
      if (updateData.establishmentDate)
        businessUpdateData.establishmentDate = updateData.establishmentDate;
      if (updateData.businessTerm)
        businessUpdateData.businessTerm = updateData.businessTerm;

      if (Object.keys(businessUpdateData).length > 0) {
        await businessFormApi.setValues(businessUpdateData);
      }

      message.success('数据导入成功');
    } else {
      message.warning('未找到可导入的数据');
    }

    // 12. 导入地址信息（如果存在地区名称、详细地址或联系电话）
    const hasAddressData = detail.regionName || detail.address || detail.phone;
    if (hasAddressData) {
      // 检查地址列表是否为空
      const shouldSetDefault = addressList.value.length === 0;

      // 构建地址对象
      const newAddress: ClientAdminApi.ClientAddressAddDto = {
        name: detail.regionName || detail.name || '默认地址',
        address: detail.address || '',
        contactPerson: '', // 风鸟数据中没有联系人字段
        mobile: detail.phone || '',
        tel: '', // 风鸟数据中只有一个电话字段，用作mobile
        isDefault: shouldSetDefault, // 如果地址列表为空，设置为默认地址
        remark: '',
      };

      // 如果设置为默认地址，先取消其他地址的默认状态
      if (shouldSetDefault) {
        addressList.value.forEach((item) => {
          item.isDefault = false;
        });
      }

      // 添加地址到列表
      addressList.value.push(newAddress);

      //message.success('地址信息导入成功');
    }

    // 关闭弹窗
    riskbirdModalApi.close();
  } catch (error: any) {
    console.error('导入失败:', error);
    message.error(error?.message || '导入失败');
  }
};

/** DatePicker 需要的 dayjs 对象，API 返回的是字符串 */
const toDayjs = (val: string | null | undefined) =>
  val && dayjs(val).isValid() ? dayjs(val) : undefined;
/** 提交时 dayjs/日期 转回 ISO 字符串 */
const toDateString = (val: unknown) => {
  if (val == null) return undefined;
  const d = dayjs(val as string | Date);
  return d.isValid() ? d.toISOString() : undefined;
};

/**
 * 将后端的 areaId（最后一级 code）通过 GetAreaAndParents 接口转为路径数组
 */
const buildAreaPath = async (areaId?: string): Promise<string[]> => {
  if (!areaId) return [];
  try {
    const areas = await getAreaAndParents(areaId);
    if (!areas || areas.length === 0) return [];

    // 根据 parentId 链构建从根到叶的有序路径
    const idSet = new Set(areas.map((a) => a.id));
    const root = areas.find((a) => !a.parentId || !idSet.has(a.parentId));
    if (!root) return areas.map((a) => a.id).filter(Boolean) as string[];

    const ordered = [root];
    while (ordered.length < areas.length) {
      const currentId = ordered[ordered.length - 1]!.id;
      const next = areas.find((a) => a.parentId === currentId);
      if (!next) break;
      ordered.push(next);
    }
    return ordered.map((a) => a.id).filter(Boolean) as string[];
  } catch {
    return [];
  }
};

/**
 * 监听客户全称变化，自动生成客户代码
 * 使用 Vue 的 watch API，比直接监听表单实例更可靠且符合 Vue 规范
 */
watch(
  () => currentFullName.value,
  (newFullName) => {
    // 只在新增模式下且客户代码为空时自动生成
    if (!isEdit.value && newFullName) {
      baseFormApi.getValues().then((values: any) => {
        const currentCode = values.code;
        if (!currentCode) {
          const autoCode = getFirstLetters(newFullName);
          if (autoCode) {
            baseFormApi.setValues({ code: autoCode });
          }
        }
      });
    }
  },
);

/** 将详情数据映射到表单值 */
const mapDetailToFormValues = async (detail: ClientAdminApi.ClientDto) => {
  // areaId: 后端只存最后一级 code，通过接口转为 [省code, 市code, 区code] 给 AreaCascader
  const areaIdPath = await buildAreaPath(detail.areaId);

  // 处理行业类别：将字符串转换为数组
  let industryCategoriesArray = detail.industryCategories
    ? detail.industryCategories
        .split('')
        .map((v) => v.trim())
        .filter(Boolean)
    : [];
  industryCategoriesArray = industryCategoriesArray.filter(
    (item, index) => industryCategoriesArray.indexOf(item) === index,
  );
  // 区分客户和供应商的行业类别
  const isCustomer = detail.isClient;
  const isSupplierDetail = detail.isSupplier;

  // 设置客户类型
  isClient.value = detail.isClient;
  isClient.value ? (isCustomerType.value = [1]) : (isCustomerType.value = []);
  isSupplier.value = detail.isSupplier;
  isSupplier.value ? (isSupplierType.value = [2]) : (isSupplierType.value = []);

  // 设置失信状态
  isDishonest.value = (detail as any).isDishonest ?? false;
  clientStatus.value = detail.clientStatus;

  // 设置行业类别
  if (isClient.value) {
    customerType.value = industryCategoriesArray;
  }
  if (isSupplier.value) {
    supplierType.value = industryCategoriesArray;
  }

  // 初始化干系人列表
  defaultOrderUsers.value.forEach((orderUser) => {
    switch (orderUser.userAttribute) {
      case UserAttribute.Sales:
        orderUser.userIds = detail.sales?.map((s) => s.userId) || [];
        orderUser.stakeholderList = detail.sales;
        break;
      case UserAttribute.Operation:
        orderUser.userIds = detail.operations?.map((s) => s.userId) || [];
        orderUser.stakeholderList = detail.operations;
        break;
      case UserAttribute.CustomerService:
        orderUser.userIds = detail.customerServices?.map((s) => s.userId) || [];
        orderUser.stakeholderList = detail.customerServices;
        break;
      case UserAttribute.Documentation:
        orderUser.userIds = detail.documentations?.map((s) => s.userId) || [];
        orderUser.stakeholderList = detail.documentations;
        break;
    }
  });

  // 初始化对账人列表
  reconcilerUserIds.value = detail.reconcilers?.map((r) => r.userId) || [];
  reconcilerList.value = detail.reconcilers || [];

  // 初始化地址列表
  addressList.value = (detail.addresses || []).map((addr) => ({
    id: addr.id,
    name: addr.name || '',
    isDefault: addr.isDefault,
    addressType: addr.addressType,
    address: addr.address || '',
    contactPerson: addr.contactPerson || '',
    mobile: addr.mobile || '',
    tel: addr.tel || '',
    remark: addr.remark || '',
  }));
  billingPeriods.value = (detail.billingPeriods ?? []) as any[];

  return {
    // 基础信息表单
    name: detail.name,
    fullName: detail.fullName,
    code: detail.code,
    enName: detail.enName,
    taxNo: detail.taxNo,
    taxRate: detail.taxRate ?? undefined,
    codeSourceId: detail.codeSourceId,
    phone: detail.phone,
    mobile: detail.mobile,
    email: detail.email,
    url: detail.url,
    enterpriseType: detail.enterpriseType, // 添加企业类型字段
    orgId: detail.orgId, // 归属组织字段
    isShared: normalizeClientSharedType(detail.isShared),
    remark: detail.remark,
    country: detail.countryId,
    areaId: areaIdPath,
    address: detail.address,
    enAddress: detail.enAddress,
    mainProduct: detail.mainProduct,
    enable: detail.enable,

    // 业务信息表单
    legalPerson: detail.legalPerson,
    registeredCapital: detail.registeredCapital,
    establishmentDate: toDayjs(detail.establishmentDate),
    businessTerm: detail.businessTerm,

    // 客户信息表单
    clientType: detail.clientType,
    clientLevel: detail.clientLevel,
    source: detail.source,
    cargoType: detail.cargoType,
    clientCurrencyId: detail.clientCurrencyId,
    clientYearTeu: detail.clientYearTeu?.toString(),
    clientYearTicketCount: detail.clientYearTicketCount?.toString(),
    clientCoopSince: toDayjs(detail.clientCoopSince),
    clientLastTxnTime: toDayjs(detail.clientLastTxnTime),

    // 供应商信息表单
    supplierLevel: detail.supplierLevel,
    supplierYearTeu: detail.supplierYearTeu?.toString(),
    supplierYearTicketCount: detail.supplierYearTicketCount?.toString(),
    laneIds: detail.clientLaneCodes?.map((lane) => lane.id),
    supplierCurrencyId: detail.supplierCurrencyId,
    supplierCoopSince: toDayjs(detail.supplierCoopSince),
    supplierLastTxnTime: toDayjs(detail.supplierLastTxnTime),
  };
};

function clearAuditHighlights() {
  changedAuditFields.value = new Set();
  changedAuditSections.value = {
    addresses: false,
    billingPeriods: false,
    industry: false,
    stakeholders: false,
    type: false,
  };
  baseFormApi.updateSchema(
    [
      'name',
      'fullName',
      'code',
      'enName',
      'taxNo',
      'taxRate',
      'codeSourceId',
      'phone',
      'mobile',
      'email',
      'url',
      'enterpriseType',
      'orgId',
      'remark',
    ].map((fieldName) => ({
      fieldName,
      formItemClass: fieldName === 'remark' ? 'col-span-2' : undefined,
    })),
  );
  businessFormApi.updateSchema(
    [
      'legalPerson',
      'registeredCapital',
      'establishmentDate',
      'businessTerm',
    ].map((fieldName) => ({ fieldName, formItemClass: undefined })),
  );
  clientFormApi.updateSchema(
    [
      'clientType',
      'clientLevel',
      'cargoType',
      'clientCurrencyId',
      'remark',
    ].map((fieldName) => ({
      fieldName,
      formItemClass: fieldName === 'remark' ? 'col-span-3' : undefined,
    })),
  );
  supplierFormApi.updateSchema(
    ['supplierLevel', 'supplierCurrencyId', 'laneIds'].map((fieldName) => ({
      fieldName,
      formItemClass: undefined,
    })),
  );
}

function applyAuditFieldHighlights(fields: Set<string>) {
  const mark = (
    api: typeof baseFormApi,
    names: string[],
    remarkSpan?: string,
  ) => {
    api.updateSchema(
      names
        .filter((name) => fields.has(name))
        .map((fieldName) => ({
          fieldName,
          formItemClass:
            fieldName === 'remark' && remarkSpan
              ? `${remarkSpan} client-audit-field--changed`
              : 'client-audit-field--changed',
        })),
    );
  };
  mark(
    baseFormApi,
    [
      'name',
      'fullName',
      'code',
      'enName',
      'taxNo',
      'taxRate',
      'codeSourceId',
      'phone',
      'mobile',
      'email',
      'url',
      'enterpriseType',
      'orgId',
      'remark',
    ],
    'col-span-2',
  );
  mark(businessFormApi, [
    'legalPerson',
    'registeredCapital',
    'establishmentDate',
    'businessTerm',
  ]);
  mark(
    clientFormApi,
    ['clientType', 'clientLevel', 'cargoType', 'clientCurrencyId', 'remark'],
    'col-span-3',
  );
  mark(supplierFormApi, ['supplierLevel', 'supplierCurrencyId', 'laneIds']);
}

/** 把申请修改的目标快照写入表单，审核人看到的是「申请后的内容」 */
async function applyModifySnapshotToForm(to: ClientAdminApi.ClientEditDto) {
  const areaIdPath = await buildAreaPath(to.areaId);
  const industryCategoriesArray = to.industryCategories
    ? to.industryCategories
        .split('')
        .map((v) => v.trim())
        .filter(Boolean)
    : [];

  isClient.value = !!to.isClient;
  isCustomerType.value = to.isClient ? [1] : [];
  isSupplier.value = !!to.isSupplier;
  isSupplierType.value = to.isSupplier ? [2] : [];
  customerType.value = to.isClient ? industryCategoriesArray : [];
  supplierType.value = to.isSupplier ? industryCategoriesArray : [];

  defaultOrderUsers.value.forEach((orderUser) => {
    switch (orderUser.userAttribute) {
      case UserAttribute.Sales:
        orderUser.userIds = to.sales?.map((s) => s.userId) || [];
        orderUser.stakeholderList = (to.sales as any) || [];
        break;
      case UserAttribute.Operation:
        orderUser.userIds = to.operations?.map((s) => s.userId) || [];
        orderUser.stakeholderList = (to.operations as any) || [];
        break;
      case UserAttribute.CustomerService:
        orderUser.userIds = to.customerServices?.map((s) => s.userId) || [];
        orderUser.stakeholderList = (to.customerServices as any) || [];
        break;
      case UserAttribute.Documentation:
        orderUser.userIds = to.documentations?.map((s) => s.userId) || [];
        orderUser.stakeholderList = (to.documentations as any) || [];
        break;
    }
  });
  const nextReconcilerIds = to.reconcilerUserIds ?? [];
  reconcilerUserIds.value = nextReconcilerIds;
  const prevReconcilerMap = new Map(
    reconcilerList.value.map((item) => [item.userId, item]),
  );
  reconcilerList.value = nextReconcilerIds.map((userId) => {
    const prev = prevReconcilerMap.get(userId);
    if (prev) return prev;
    return {
      id: '0',
      clientId: editId.value || '',
      userId,
      userNickName: '',
    };
  });
  addressList.value = (to.addresses || []).map((addr, index) => ({
    id: (addr as { id?: number }).id ?? index,
    name: addr.name || '',
    isDefault: !!addr.isDefault,
    addressType: addr.addressType,
    address: addr.address || '',
    contactPerson: addr.contactPerson || '',
    mobile: addr.mobile || '',
    tel: addr.tel || '',
    remark: addr.remark || '',
  }));
  billingPeriods.value = (to.billingPeriods ?? []) as any[];

  const formValues = {
    name: to.name,
    fullName: to.fullName,
    code: to.code,
    enName: to.enName,
    taxNo: to.taxNo,
    taxRate: to.taxRate ?? undefined,
    codeSourceId: to.codeSourceId,
    phone: to.phone,
    mobile: to.mobile,
    email: to.email,
    url: to.url,
    enterpriseType: to.enterpriseType,
    orgId: to.orgId,
    isShared: normalizeClientSharedType(to.isShared),
    remark: to.remark,
    country: to.countryId,
    areaId: areaIdPath,
    address: to.address,
    enAddress: to.enAddress,
    mainProduct: to.mainProduct,
    enable: to.enable,
    legalPerson: to.legalPerson,
    registeredCapital: to.registeredCapital,
    establishmentDate: toDayjs(to.establishmentDate),
    businessTerm: to.businessTerm,
    clientType: to.clientType,
    clientLevel: to.clientLevel,
    source: to.source,
    cargoType: to.cargoType,
    clientCurrencyId: to.clientCurrencyId,
    supplierLevel: to.supplierLevel,
    laneIds: to.laneIds,
    supplierCurrencyId: to.supplierCurrencyId,
  };

  await baseFormApi.setValues(formValues);
  isSharedValue.value = normalizeClientSharedType(formValues.isShared);
  await businessFormApi.setValues(formValues);
  await nextTick();
  if (isClient.value) {
    await clientFormApi.setValues(formValues);
  }
  if (isSupplier.value) {
    await supplierFormApi.setValues(formValues);
  }
}

async function loadAuditContext() {
  if (!editId.value || !isAuditMode.value) return;
  clearAuditHighlights();
  try {
    auditDetail.value = await getClientAuditDetail(editId.value);
    if (
      auditDetail.value.taskType === ClientTaskType.ModifyClient &&
      auditDetail.value.modifyTo
    ) {
      const { fields, sections } = computeAuditModifyChanges(
        auditDetail.value.modifyFrom,
        auditDetail.value.modifyTo,
      );
      changedAuditFields.value = fields;
      changedAuditSections.value = sections;
      await applyModifySnapshotToForm(auditDetail.value.modifyTo);
      await nextTick();
      await nextTick();
      applyAuditFieldHighlights(fields);
    }
  } catch (error) {
    console.error('加载客户审核详情失败:', error);
    message.error('加载客户审核详情失败');
  }
}

async function leaveAuditPage() {
  markListShouldRefresh('ClientReview');
  const currentTabKey = route.fullPath;
  await router.push('/audit-approval/client-review');
  await closeTabByKey(currentTabKey);
}

async function doPageAudit(success: boolean, remark: string) {
  const id = editId.value;
  if (!id) return;
  auditSubmitting.value = true;
  try {
    await auditClient({
      ids: [id],
      remark: remark || undefined,
      success,
    });
    message.success(success ? '已通过客户审核' : '已驳回客户');
    await leaveAuditPage();
  } finally {
    auditSubmitting.value = false;
  }
}

const handleAuditPass = () => {
  if (!canPendingAudit.value) return;
  openAuditRemarkConfirm({
    title: $t('auditApproval.task.okPass'),
    remarkRequired: false,
    maxlength: 4096,
    onConfirm: (remark) => doPageAudit(true, remark),
  });
};

const handleAuditReject = () => {
  if (!canPendingAudit.value) return;
  openAuditRemarkConfirm({
    title: '确认驳回',
    danger: true,
    remarkRequired: true,
    remarkRequiredMessage: '驳回原因不能为空',
    maxlength: 4096,
    onConfirm: (remark) => doPageAudit(false, remark),
  });
};

const handleAuditPostReject = () => {
  if (!canPostRejectAudit.value) return;
  openAuditRemarkConfirm({
    title: '确认通过后驳回',
    danger: true,
    remarkRequired: true,
    remarkRequiredMessage: '驳回原因不能为空',
    maxlength: 4096,
    onConfirm: (remark) => doPageAudit(false, remark),
  });
};

const handleAuditTransfer = () => {
  if (!canPendingAudit.value) return;
  const itemId = findMyPendingWorkFlowItemId(
    auditDetail.value?.workFlowInstance,
    userStore.userInfo?.userId,
  );
  if (!itemId) {
    message.warning('未找到当前待审的工作流明细，请刷新后重试');
    return;
  }
  transferModalApi
    .setData({ itemIds: [itemId], permissions: [auditActionCode] })
    .open();
};

const onAuditTransferSuccess = async () => {
  await leaveAuditPage();
};

/**
 * 加载编辑数据
 */
const loadEditData = async () => {
  if (!editId.value) return;

  // 换客户或保存后重新拉详情，页内的申请修改开关回到路由本身的口径
  modifyModeOverride.value = false;
  pageLoading.value = true;
  try {
    const detail = await getClientDetail(editId.value);
    const formValues = await mapDetailToFormValues(detail);

    // 设置各个表单的值
    await baseFormApi.setValues(formValues);
    isSharedValue.value = normalizeClientSharedType(formValues.isShared);
    await businessFormApi.setValues(formValues);

    // 根据客户类型设置对应的表单
    if (isClient.value) {
      await clientFormApi.setValues(formValues);
    }
    if (isSupplier.value) {
      await supplierFormApi.setValues(formValues);
    }

    // 触发响应式更新
    await nextTick();
    if (isAuditMode.value) {
      await loadAuditContext();
    } else {
      clearAuditHighlights();
      auditDetail.value = null;
    }
    await syncFormSnapshot();
  } catch (error) {
    console.error('加载编辑数据失败:', error);
    //message.error($t('common.loadFailed'));
  } finally {
    pageLoading.value = false;
  }
};
const handleClientTypeChange = (checkedValues: any[]) => {};

const handleIsClientChange = (e: any) => {
  const checked = e.includes(1);
  isClient.value = checked;
  if (!checked) {
    // 取消客户类型时，清空客户的行业类别选择
    customerType.value = [];
  }
};

const handleIsSupplierChange = (e: any) => {
  const checked = e.includes(2);
  isSupplier.value = checked;
  if (!checked) {
    // 取消供应商类型时，清空供应商的行业类别选择
    supplierType.value = [];
  }
};

/**
 * 更新干系人列表
 */
const updateStakeholders = async (
  userAttribute: number | undefined,
  values: number[],
) => {
  if (formLocked.value) return;
  defaultOrderUsers.value.forEach((orderUser) => {
    if (orderUser.userAttribute === userAttribute) {
      // 更新 userIds
      orderUser.userIds = values;

      // 同步更新 stakeholderList，确保编辑模式下能正确提交
      const existingList = orderUser.stakeholderList || [];
      const existingMap = new Map(
        existingList.map((item) => [item.userId, item]),
      );

      orderUser.stakeholderList = values.map((userId) => {
        const existing = existingMap.get(userId);
        if (existing) {
          // 如果已存在，保留原有信息
          return existing;
        } else {
          // 如果是新增的，创建基本对象（编辑模式需要 clientId）
          return {
            clientId: editId.value || '',
            userId,
            isDefault: false,
            userAttribute: userAttribute!,
            isDeleted: false,
            creationTime: new Date().toISOString(),
            id: 0, // 新增的干系人 id 为 0
          } as ClientAdminApi.ClientStakeholderDto;
        }
      });
    }
  });

  // 如果是销售角色且有选中值，取第一个人并更新所属公司
  if (userAttribute === UserAttribute.Sales && values.length > 0) {
    try {
      const firstSalesUserId = values[0];
      if (firstSalesUserId !== undefined) {
        const userInfo = await getUser(firstSalesUserId, { silent: true });

        // 获取用户的默认组织（default=true的组织）
        const defaultOrg = userInfo.organizations?.find((org) => org.default);

        if (
          defaultOrg &&
          defaultOrg.oneOrganizationPath &&
          defaultOrg.oneOrganizationPath.length > 0
        ) {
          // 从组织路径中查找第一个公司（isCompany=true）
          // 组织路径是从顶级到底级，公司通常在顶层
          const companyOrg = defaultOrg.oneOrganizationPath.find(
            (org) => org.isCompany,
          );

          if (companyOrg && companyOrg.id) {
            // 更新基础信息表单中的所属公司字段
            await baseFormApi.setValues({
              orgId: companyOrg.id,
            });
          } else {
            console.warn(
              '⚠️ [销售联动] 该销售人员的默认组织路径中未找到公司节点',
            );
          }
        }
      }
    } catch (error) {
      console.error('❌ [销售联动] 获取用户组织信息失败:', error);
    }
  }
};

/**
 * 更新对账人列表
 */
const updateReconcilers = (values: number[]) => {
  if (formLocked.value) return;
  reconcilerUserIds.value = values;
  const existingMap = new Map(
    reconcilerList.value.map((item) => [item.userId, item]),
  );
  reconcilerList.value = values.map((userId) => {
    const existing = existingMap.get(userId);
    if (existing) return existing;
    return {
      id: '0',
      clientId: editId.value || '',
      userId,
      userNickName: '',
    };
  });
};

/**
 * 提交表单
 */
/**
 * 申请修改原因弹窗。取消返回 null，确认返回 trim 后的原因（必填，≤4096）。
 */
const promptApplyRemark = (): Promise<null | string> => {
  return new Promise((resolve) => {
    const formData = ref({ applyRemark: '' });
    let settled = false;
    const settle = (value: null | string) => {
      if (settled) return;
      settled = true;
      resolve(value);
    };

    Modal.confirm({
      title: '申请修改',
      width: 600,
      icon: null,
      // 用渲染函数而非静态 VNode，否则字数统计跟不上输入
      content: () =>
        h('div', { style: 'margin-top: 8px;' }, [
          h(
            'p',
            { style: 'margin-bottom: 12px; color: #595959;' },
            '本次修改需审批通过后才会生效，请填写申请原因。',
          ),
          h(Input.TextArea, {
            value: formData.value.applyRemark,
            placeholder: '请输入申请修改原因（必填，最多4096字符）',
            rows: 4,
            maxlength: 4096,
            showCount: true,
            onChange: (e: any) => {
              formData.value.applyRemark = e.target?.value ?? '';
            },
          }),
        ]),
      okText: '提交申请',
      cancelText: $t('common.cancel'),
      onOk() {
        const remark = formData.value.applyRemark?.trim();
        if (!remark) {
          message.error('申请修改原因不能为空');
          return Promise.reject(new Error('applyRemark required'));
        }
        settle(remark);
      },
      onCancel() {
        settle(null);
      },
    });
  });
};

const handleSubmit = async (closeAfterSave = false) => {
  try {
    submitting.value = true;

    if (isEdit.value && !canSaveClient.value) {
      Modal.warning({
        title: '提示',
        content: clientStatusHint.value,
        okText: '确定',
      });
      return;
    }

    // 验证所有表单
    let baseValid = true;
    let businessValid = true;
    let clientValid = true;
    let supplierValid = true;
    let baseValidationError = null;
    let businessValidationError = null;
    let clientValidationError = null;
    let supplierValidationError = null;

    try {
      await baseFormApi.validate();
    } catch (error) {
      baseValid = false;
      baseValidationError = error;
      console.warn('基础表单验证失败:', error);
    }

    try {
      await businessFormApi.validate();
    } catch (error) {
      businessValid = false;
      businessValidationError = error;
      console.warn('业务表单验证失败:', error);
    }

    if (isClient.value) {
      try {
        await clientFormApi.validate();
      } catch (error) {
        clientValid = false;
        clientValidationError = error;
        console.warn('客户表单验证失败:', error);
      }
    }

    if (isSupplier.value) {
      try {
        await supplierFormApi.validate();
      } catch (error) {
        supplierValid = false;
        supplierValidationError = error;
        console.warn('供应商表单验证失败:', error);
      }
    }

    // 【新增】如果基础表单验证失败，获取具体字段并弹窗提示
    if (!baseValid) {
      const baseValues = await baseFormApi.getValues();
      const missingFields = [];

      if (!baseValues.name || baseValues.name.trim() === '') {
        missingFields.push('客户简称');
      }
      if (!baseValues.fullName || baseValues.fullName.trim() === '') {
        missingFields.push('客户全称');
      }
      if (!baseValues.code || baseValues.code.trim() === '') {
        missingFields.push('客户代码');
      }
      if (!baseValues.orgId) {
        missingFields.push('所属公司');
      }

      if (missingFields.length > 0) {
        Modal.warning({
          title: '提示',
          content: `请填写以下必填字段：${missingFields.join('、')}`,
          okText: '确定',
        });
        return;
      }

      // 如果是其他字段验证失败，给出通用提示
      message.warning($t('ui.formRules.pleaseCompleteRequiredFields'));
      return;
    }

    // 【新增】即使基础表单验证通过，也要确保所属公司字段已填写
    const baseValuesAfterValidation = await baseFormApi.getValues();
    if (!baseValuesAfterValidation.orgId) {
      Modal.warning({
        title: '提示',
        content: '请填写必填字段：所属公司',
        okText: '确定',
      });
      return;
    }

    if (!businessValid) {
      message.warning($t('ui.formRules.pleaseCompleteRequiredFields'));
      return;
    }

    // 如果是客户类型，额外校验客户性质是否已选择
    if (isClient.value) {
      const clientValuesCheck = await clientFormApi.getValues();

      if (
        clientValuesCheck.clientType === undefined ||
        clientValuesCheck.clientType === null
      ) {
        console.warn('❌ 客户性质未选择，阻止保存');
        Modal.warning({
          title: '提示',
          content: '请选择客户性质（同行/直客）',
          okText: '确定',
        });
        return;
      }
    }

    // 【新增】校验客户属性和供应商属性的必填规则
    // 规则1：勾选【客户类型】→ 必须至少勾选 1 项客户属性才允许保存
    // 规则2：勾选【供应商类型】→ 必须至少勾选 1 项供应商属性才允许保存
    // 规则3：若客户、供应商两类同时勾选，则客户属性、供应商属性两边都至少要选一项，才可保存

    const hasCustomerType = isClient.value;
    const hasSupplierType = isSupplier.value;
    const hasCustomerAttributes =
      customerType.value && customerType.value.length > 0;
    const hasSupplierAttributes =
      supplierType.value && supplierType.value.length > 0;

    // 如果勾选了客户类型，但未选择任何客户属性
    if (hasCustomerType && !hasCustomerAttributes) {
      Modal.warning({
        title: '提示',
        content: '已勾选客户类型，请至少选择一项客户属性（行业类别）',
        okText: '确定',
      });
      return;
    }

    // 如果勾选了供应商类型，但未选择任何供应商属性
    if (hasSupplierType && !hasSupplierAttributes) {
      Modal.warning({
        title: '提示',
        content: '已勾选供应商类型，请至少选择一项供应商属性（行业类别）',
        okText: '确定',
      });
      return;
    }

    // 如果是供应商类型，校验供应商表单
    if (isSupplier.value && !supplierValid) {
      message.warning($t('ui.formRules.pleaseCompleteRequiredFields'));
      return;
    }

    // 获取所有表单的值
    const baseValues = await baseFormApi.getValues();
    const businessValues = await businessFormApi.getValues();
    const clientValues = isClient.value ? await clientFormApi.getValues() : {};
    const supplierValues = isSupplier.value
      ? await supplierFormApi.getValues()
      : {};

    let createdId: any;

    // 处理行业类别：将数组转换为字符串
    const industryCategories = [
      ...new Set([
        ...(customerType.value || []),
        ...(supplierType.value || []),
      ]),
    ].join('');

    // 构建地址列表（编辑模式保留id，新增模式不包含id）
    const addresses = addressList.value.map((item) => {
      const addressData: any = {
        name: item.name || '',
        isDefault: item.isDefault ?? false,
        addressType: item.addressType,
        address: item.address,
        contactPerson: item.contactPerson,
        mobile: item.mobile,
        tel: item.tel,
        remark: item.remark,
      };

      // 编辑模式下，如果地址有id，需要保留
      if (isEdit.value && item.id) {
        addressData.id = item.id;
      }

      return addressData;
    });

    // 处理 areaId：取路径数组的最后一个（最后一级）
    const areaIdPath = Array.isArray(baseValues.areaId)
      ? baseValues.areaId
      : [];
    const areaId =
      areaIdPath.length > 0 ? areaIdPath[areaIdPath.length - 1] : undefined;

    // 构建干系人列表（根据新增/编辑使用不同的DTO）
    if (isEdit.value && editId.value) {
      const currentEditId = editId.value; // 创建局部变量确保类型安全

      // 编辑模式：使用ClientStakeholderEditDto（需要id）
      const salesEdit = defaultOrderUsers.value
        .find((item) => item.userAttribute === UserAttribute.Sales)
        ?.stakeholderList?.map((item) => ({
          id: item.id,
          userId: item.userId,
          isDefault: item.isDefault,
          userAttribute: item.userAttribute!,
          clientId: currentEditId,
        }));

      const customerServicesEdit = defaultOrderUsers.value
        .find((item) => item.userAttribute === UserAttribute.CustomerService)
        ?.stakeholderList?.map((item) => ({
          id: item.id,
          userId: item.userId,
          isDefault: item.isDefault,
          userAttribute: item.userAttribute!,
          clientId: currentEditId,
        }));

      const operationsEdit = defaultOrderUsers.value
        .find((item) => item.userAttribute === UserAttribute.Operation)
        ?.stakeholderList?.map((item) => ({
          id: item.id,
          userId: item.userId,
          isDefault: item.isDefault,
          userAttribute: item.userAttribute!,
          clientId: currentEditId,
        }));

      const documentationsEdit = defaultOrderUsers.value
        .find((item) => item.userAttribute === UserAttribute.Documentation)
        ?.stakeholderList?.map((item) => ({
          id: item.id,
          userId: item.userId,
          isDefault: item.isDefault,
          userAttribute: item.userAttribute!,
          clientId: currentEditId,
        }));

      // 编辑模式提交数据
      const editData: ClientAdminApi.ClientEditDto = {
        id: currentEditId,
        // 基本信息
        name: baseValues.name.trim(),
        code: baseValues.code,
        phone: baseValues.phone,
        mobile: baseValues.mobile,
        fullName: baseValues.fullName.trim(),
        enName: baseValues.enName,
        countryId: baseValues.country,
        areaId,
        address: baseValues.address,
        enAddress: baseValues.enAddress,
        mainProduct: baseValues.mainProduct,
        enable: baseValues.enable ?? true,

        enterpriseType: baseValues.enterpriseType, // 企业类型字段
        orgId: baseValues.orgId, // 归属组织字段
        isShared: normalizeClientSharedType(baseValues.isShared),
        industryCategories,
        codeSourceId: baseValues.codeSourceId,
        remark: baseValues.remark,
        enFullName: baseValues.enFullName,
        taxNo: baseValues.taxNo,
        taxRate:
          baseValues.taxRate === undefined || baseValues.taxRate === null
            ? null
            : Number(baseValues.taxRate),
        email: baseValues.email,
        url: baseValues.url,
        clientType: isClient.value ? clientValues.clientType : undefined,

        // 业务信息
        legalPerson: businessValues.legalPerson,
        registeredCapital: businessValues.registeredCapital,
        establishmentDate: businessValues.establishmentDate,
        businessTerm: businessValues.businessTerm,

        // 客户相关信息
        isClient: isClient.value,

        clientLevel: isClient.value ? clientValues.clientLevel : undefined,
        source: isClient.value ? clientValues.source : undefined,
        cargoType: isClient.value ? clientValues.cargoType : undefined,
        clientCurrencyId: isClient.value
          ? clientValues.clientCurrencyId
          : undefined,

        // 供应商相关信息
        isSupplier: isSupplier.value,
        supplierLevel: isSupplier.value
          ? supplierValues.supplierLevel
          : undefined,
        supplierCurrencyId: isSupplier.value
          ? supplierValues.supplierCurrencyId
          : undefined,
        laneIds: isSupplier.value ? supplierValues.laneIds : undefined,

        sales: salesEdit,
        customerServices: customerServicesEdit,
        operations: operationsEdit,
        documentations: documentationsEdit,

        addresses,
        billingPeriods: toBillingPeriodInputs(billingPeriods.value),
        // 对账人用户ID列表
        reconcilerUserIds: reconcilerUserIds.value,
      };
      // 申请修改：同一份编辑提交体交给审核接口，子表按整份替换，审批通过后才落到客户上
      if (isModifyMode.value) {
        const applyRemark = await promptApplyRemark();
        if (!applyRemark) return;
        await modifyClientAudit({ applyRemark, client: editData });
        message.success('申请修改已提交，等待审批');
        markListShouldRefresh('ClientList');
        await syncFormSnapshot();
        const currentTabKey = route.fullPath;
        await router.push('/clients');
        await closeTabByKey(currentTabKey);
        return;
      }

      createdId = await editClient(editData);
      if (createdId) {
        message.success($t('ui.actionMessage.operationSuccess'));
        markListShouldRefresh('ClientList');
        if (closeAfterSave) {
          await syncFormSnapshot();
          const currentTabKey = route.fullPath;
          await router.push('/clients');
          await closeTabByKey(currentTabKey);
        } else {
          // 重新拉详情，把新建账期的 id 写回，避免下次保存被当成新增并删掉原条
          await loadEditData();
        }
      }
    } else {
      // 新增模式：使用ClientStakeholderAddDto（不需要id和clientId）
      const salesAdd = defaultOrderUsers.value
        .find((item) => item.userAttribute === UserAttribute.Sales)
        ?.userIds?.map((userId) => ({
          userId,
          isDefault: false,
          userAttribute: UserAttribute.Sales,
        }));

      const customerServicesAdd = defaultOrderUsers.value
        .find((item) => item.userAttribute === UserAttribute.CustomerService)
        ?.userIds?.map((userId) => ({
          userId,
          isDefault: false,
          userAttribute: UserAttribute.CustomerService,
        }));

      const operationsAdd = defaultOrderUsers.value
        .find((item) => item.userAttribute === UserAttribute.Operation)
        ?.userIds?.map((userId) => ({
          userId,
          isDefault: false,
          userAttribute: UserAttribute.Operation,
        }));

      const documentationsAdd = defaultOrderUsers.value
        .find((item) => item.userAttribute === UserAttribute.Documentation)
        ?.userIds?.map((userId) => ({
          userId,
          isDefault: false,
          userAttribute: UserAttribute.Documentation,
        }));

      // 新增模式提交数据
      const addData: ClientAdminApi.ClientAddDto = {
        // 基本信息
        name: baseValues.name,
        code: baseValues.code,
        phone: baseValues.phone,
        mobile: baseValues.mobile,
        fullName: baseValues.fullName,
        enName: baseValues.enName,
        countryId: baseValues.country,
        areaId,
        address: baseValues.address,
        enAddress: baseValues.enAddress,
        mainProduct: baseValues.mainProduct,
        enable: baseValues.enable ?? true,

        enterpriseType: baseValues.enterpriseType, // 添加企业类型字段
        orgId: baseValues.orgId, // 归属组织字段
        isShared: normalizeClientSharedType(baseValues.isShared),
        industryCategories,
        codeSourceId: baseValues.codeSourceId,
        remark: baseValues.remark,
        enFullName: baseValues.enFullName,
        taxNo: baseValues.taxNo,
        taxRate:
          baseValues.taxRate === undefined || baseValues.taxRate === null
            ? null
            : Number(baseValues.taxRate),
        email: baseValues.email,
        url: baseValues.url,
        clientType: isClient.value ? clientValues.clientType : undefined,

        // 业务信息
        legalPerson: businessValues.legalPerson,
        registeredCapital: businessValues.registeredCapital,
        establishmentDate: businessValues.establishmentDate,
        businessTerm: businessValues.businessTerm,

        // 客户相关信息
        isClient: isClient.value,

        clientLevel: isClient.value ? clientValues.clientLevel : undefined,
        source: isClient.value ? clientValues.source : undefined,
        cargoType: isClient.value ? clientValues.cargoType : undefined,
        clientCurrencyId: isClient.value
          ? clientValues.clientCurrencyId
          : undefined,
        // 供应商相关信息
        isSupplier: isSupplier.value,
        supplierLevel: isSupplier.value
          ? supplierValues.supplierLevel
          : undefined,
        supplierCurrencyId: isSupplier.value
          ? supplierValues.supplierCurrencyId
          : undefined,
        laneIds: isSupplier.value ? supplierValues.laneIds : undefined,

        sales: salesAdd,
        customerServices: customerServicesAdd,
        operations: operationsAdd,
        documentations: documentationsAdd,

        addresses,
        billingPeriods: toBillingPeriodInputs(billingPeriods.value),
        // 对账人用户ID列表
        reconcilerUserIds: reconcilerUserIds.value,
      };

      const createdId = await addClient(addData);
      if (createdId) {
        message.success($t('ui.actionMessage.operationSuccess'));
        await syncFormSnapshot();
        markListShouldRefresh('ClientList');
        // replace 只替换路由历史不会删除原新建 tab，须显式 closeTabByKey
        const createTabKey = route.fullPath;
        await router.replace(`/clients/${createdId}/edit`);
        await closeTabByKey(createTabKey);
      }
    }
  } catch (error: any) {
    message.error($t('ui.actionMessage.operationFailed'));
    console.error('提交失败:', error);
  } finally {
    submitting.value = false;
  }
};

/**
 * 处理失信状态切换
 */
const handleDishonestToggle = async () => {
  if (!editId.value) {
    message.warning('请先保存客户信息');
    return;
  }

  // 如果当前已经是失信状态，直接取消失信（不需要输入备注）
  if (isDishonest.value) {
    Modal.confirm({
      title: '取消失信',
      content: `确定要将此客户从失信名单中移除吗？`,
      okType: 'danger',
      async onOk() {
        const hideLoading = message.loading({
          content: `正在将客户移出失信...`,
          duration: 0,
          key: 'action_process_msg',
        });

        try {
          await cancelDishonest({
            id: editId.value!,
          });
          message.success({
            content: `成功将客户移出失信`,
            key: 'action_process_msg',
          });
          isDishonest.value = false; // 更新本地状态
        } catch (error) {
          console.error('取消失信失败:', error);
          message.error('取消失信失败');
        } finally {
          hideLoading();
        }
      },
    });
    return;
  }

  // 当前不是失信状态，需要加入失信并输入备注
  const values = await baseFormApi.getValues();
  const rowName = values.fullName || values.name || editId.value;

  // 创建表单引用和响应式数据
  let formRef: any = null;
  const formData = ref({
    dishonestRemark: '',
  });

  Modal.confirm({
    title: '加入失信',
    width: 600,
    content: h('div', { style: 'margin-top: 16px;' }, [
      h(
        'p',
        {
          style: 'margin-bottom: 16px; color: #595959;',
        },
        `确定要将客户 "${rowName}" 加入失信名单吗？`,
      ),
      h(
        Form,
        {
          ref: (refInstance: any) => {
            formRef = refInstance;
          },
          model: formData.value,
          layout: 'vertical',
        },
        [
          h(
            FormItem,
            {
              label: '失信备注',
              required: true,
              rules: [
                { required: true, message: '请输入失信备注', trigger: 'blur' },
                {
                  max: 1024,
                  message: '失信备注长度不能超过1024个字符',
                  trigger: 'blur',
                },
              ],
            },
            () =>
              h(Input.TextArea, {
                value: formData.value.dishonestRemark,
                placeholder: '请输入失信原因或备注信息（必填，最多1024字符）',
                rows: 4,
                maxlength: 1024,
                showCount: true,
                onChange: (e: any) => {
                  // 使用 e.target.value 获取最新的值，兼容中文输入法
                  formData.value.dishonestRemark = e.target?.value ?? '';
                },
                onInput: (e: any) => {
                  // 同时监听 input 事件，确保中文输入也能正常更新
                  formData.value.dishonestRemark = e.target?.value ?? '';
                },
                style: 'width: 100%;',
              }),
          ),
        ],
      ),
    ]),
    okType: 'danger',
    okText: '确定',
    cancelText: '取消',
    async onOk() {
      // 验证表单
      try {
        await formRef?.validate();
      } catch (error) {
        return Promise.reject();
      }

      // 二次验证：确保备注不为空且符合长度要求
      const remark = formData.value.dishonestRemark?.trim();
      if (!remark) {
        message.error('失信备注不能为空');
        return Promise.reject();
      }

      if (remark.length > 1024) {
        message.error('失信备注长度不能超过1024');
        return Promise.reject();
      }

      const hideLoading = message.loading({
        content: `正在将客户 "${rowName}" 加入失信...`,
        duration: 0,
        key: 'action_process_msg',
      });

      try {
        await addDishonest({
          id: editId.value!,
          dishonestRemark: remark,
        });
        message.success({
          content: `成功将客户加入失信`,
          key: 'action_process_msg',
        });
        isDishonest.value = true; // 更新本地状态
      } catch (error) {
        console.error('加入失信失败:', error);
        message.error('加入失信失败');
        return Promise.reject();
      } finally {
        hideLoading();
      }
    },
  });
};

/**
 * 添加地址
 */
const addAddress = () => {
  if (formLocked.value) return;
  modalApi.setData(null).open();
};
/**
 * 编辑地址
 */
const editAddress = (data: ClientAdminApi.ClientAddressEditDto) => {
  if (formLocked.value) return;
  modalApi.setData(data).open();
};
const addressList = ref<ClientAdminApi.ClientAddressEditDto[]>([]);
const billingPeriods = ref<any[]>([]);

function toBillingPeriodInputs(
  rows: any[],
): ClientAdminApi.ClientBillingPeriodInputDto[] {
  return (rows ?? []).map((row) => ({
    ...(row.id && row.id !== 0 && row.id !== '0' ? { id: row.id } : { id: 0 }),
    permanent: !!row.permanent,
    effectiveTime: row.effectiveTime,
    expiringTime: row.expiringTime,
    settlementType: row.settlementType,
    months: row.months,
    settlementDay: row.settlementDay,
    days: row.days,
    addDays: row.addDays,
    remark: row.remark,
    contractNo: row.contractNo,
    dateType: row.dateType ?? 0,
    creditCurrencyId: row.creditCurrencyId,
    creditLimit: row.creditLimit,
    warningLimit: row.warningLimit,
    bizTypes: row.bizTypes,
    organizationUnitIds:
      row.organizationUnitIds ??
      row.cbpOrgs?.map((item: any) => item.organizationUnitId) ??
      [],
    userIds: row.userIds ?? row.cbpUsers?.map((item: any) => item.userId) ?? [],
    codeSourceIds:
      row.codeSourceIds ??
      row.cbpCodeSources?.map((item: any) => item.codeSourceId) ??
      [],
    attachments: (row.attachments ?? []).map((item: any) => ({
      id: item.id,
      attachmentId: item.attachmentId,
      attachmentDtlTypeId: item.attachmentDtlTypeId,
      clientVisible: item.clientVisible,
      displayOrder: item.displayOrder,
    })),
  }));
}

/**
 * 添加地址数据
 */
const addAddressData = (data: ClientAdminApi.ClientAddressAddDto) => {
  // 如果是第一个地址，自动设置为默认地址
  if (addressList.value.length === 0) {
    data.isDefault = true;
  }

  if (data.isDefault) {
    addressList.value.forEach((item) => {
      item.isDefault = false;
    });
  }
  addressList.value.push(data);
};
/**
 * 编辑地址数据
 */
const editAddressData = (data: ClientAdminApi.ClientAddressEditDto) => {
  if (data.isDefault) {
    addressList.value.forEach((item) => {
      item.isDefault = false;
    });
  }
  addressList.value = addressList.value.map((item) => {
    if (item.id === data.id) {
      return data;
    }
    return item;
  });
};

/**
 * 删除地址
 */
const delAddress = (index: number) => {
  if (formLocked.value) return;
  addressList.value = addressList.value.filter((_, i) => i !== index);
};

const formSnapshot = ref<null | string>(null);

async function buildClientDirtySnapshot() {
  // ClientForm/SupplierForm 仅在对应类型勾选时渲染（v-if），
  // 未渲染时 getValues() 会因等待表单挂载而永久挂起，必须跳过
  const [baseValues, businessValues, clientValues, supplierValues] =
    await Promise.all([
      baseFormApi.getValues(),
      businessFormApi.getValues(),
      isClient.value || clientFormApi.isMounted
        ? clientFormApi.getValues()
        : Promise.resolve({}),
      isSupplier.value || supplierFormApi.isMounted
        ? supplierFormApi.getValues()
        : Promise.resolve({}),
    ]);
  return JSON.stringify({
    addressList: addressList.value,
    billingPeriods: toBillingPeriodInputs(billingPeriods.value),
    baseValues,
    businessValues,
    clientValues,
    defaultOrderUsers: defaultOrderUsers.value,
    isClient: isClient.value,
    isDishonest: isDishonest.value,
    isSupplier: isSupplier.value,
    reconcilerUserIds: reconcilerUserIds.value,
    supplierValues,
  });
}

async function syncFormSnapshot() {
  await nextTick();
  formSnapshot.value = await buildClientDirtySnapshot();
}

async function isFormDirty() {
  if (!formSnapshot.value) return false;
  return (await buildClientDirtySnapshot()) !== formSnapshot.value;
}

useUnsavedGuard({
  enabled: () => !props.embedded,
  isDirty: isFormDirty,
});

defineExpose({ isFormDirty });

onMounted(() => {
  loadEditData();
  bindOrgSharedLabel();

  // 在表单初始化后，为fullName字段添加onChange监听和查询按钮
  // 使用setTimeout确保表单完全渲染后再添加按钮
  setTimeout(() => {
    if (!isEdit.value) {
      baseFormApi.updateSchema([
        {
          fieldName: 'fullName',
          suffix: () => {
            return h(
              Button,
              {
                type: 'link',
                size: 'small',
                disabled: formLocked.value,
                onClick: openRiskbirdSearch,
                class: 'ml-1',
              },
              () => [
                h(Search, { class: 'size-4' }),
                h('span', { class: 'ml-1' }, '企查查'),
              ],
            );
          },
          componentProps: {
            onChange: (e: any) => {
              const newFullName = e.target?.value || '';
              currentFullName.value = newFullName;
            },
          },
        },
      ]);
    } else {
      // 编辑模式也添加查询按钮，但不需要onChange监听
      baseFormApi.updateSchema([
        {
          fieldName: 'fullName',
          suffix: () => {
            return h(
              Button,
              {
                type: 'link',
                size: 'small',
                disabled: formLocked.value,
                onClick: openRiskbirdSearch,
                class: 'ml-1',
              },
              () => [
                h(Search, { class: 'size-4' }),
                h('span', { class: 'ml-1' }, '企查查'),
              ],
            );
          },
        },
      ]);
    }
    if (!isEdit.value) {
      void syncFormSnapshot();
    }
  }, 100); // 延迟100ms确保表单完全渲染
});

watch(
  () => `${editId.value ?? ''}:${String(route.query.mode ?? '')}`,
  (key, prev) => {
    if (!editId.value || key === prev) return;
    void loadEditData();
  },
);
</script>

<template>
  <div class="main-layout mb-2">
    <div class="center-column ml-2">
      <div class="content-column">
        <section :ref="sectionRefs.basic" class="content-section">
          <div class="content-section__actions">
            <div class="content-section__status">
              <Tag
                v-if="
                  isEdit &&
                  (auditEnabled || isAuditMode) &&
                  clientStatus !== undefined
                "
                :color="clientStatusTagColor"
              >
                {{ getClientStatusLabel(clientStatus) }}
              </Tag>
              <span
                v-if="isAuditMode && auditDetail?.applyRemark"
                class="content-section__status-hint"
                :title="auditDetail.applyRemark"
              >
                申请原因：{{ auditDetail.applyRemark }}
              </span>
              <span
                v-else-if="clientStatusHint"
                class="content-section__status-hint"
                :title="clientStatusHint"
              >
                {{ clientStatusHint }}
              </span>
            </div>
            <Space v-if="isAuditMode">
              <Button
                v-access:code="auditActionCode"
                type="primary"
                :disabled="!canPendingAudit"
                :loading="auditSubmitting"
                @click="handleAuditPass"
              >
                {{ $t('auditApproval.clientReview.auditPass') }}
              </Button>
              <Button
                v-access:code="auditActionCode"
                danger
                :disabled="!canPendingAudit"
                :loading="auditSubmitting"
                @click="handleAuditReject"
              >
                {{ $t('auditApproval.clientReview.selectReject') }}
              </Button>
              <Button
                v-access:code="auditActionCode"
                danger
                ghost
                :disabled="!canPostRejectAudit"
                :loading="auditSubmitting"
                @click="handleAuditPostReject"
              >
                {{ $t('auditApproval.clientReview.postReject') }}
              </Button>
              <Button
                :disabled="!canPendingAudit"
                :loading="auditSubmitting"
                @click="handleAuditTransfer"
              >
                转交
              </Button>
            </Space>
            <Space v-else>
              <Button
                type="primary"
                :disabled="!canSaveClient"
                :loading="submitting"
                class="flex items-center justify-center"
                @click="handleSubmit(false)"
              >
                <Save class="mr-1 inline-block size-4 align-middle" />
                <span class="align-middle">
                  {{ isModifyMode ? '提交申请修改' : $t('common.save') }}
                </span>
              </Button>
              <Button
                v-if="isEdit && !isModifyMode"
                type="primary"
                ghost
                :disabled="!canSaveClient"
                :loading="submitting"
                class="flex items-center justify-center"
                @click="handleSubmit(true)"
              >
                <IconifyIcon
                  icon="mdi:content-save-move-outline"
                  class="mr-1 inline-block size-4 align-middle"
                />
                <span class="align-middle">保存并关闭</span>
              </Button>
              <Button
                v-if="isEdit && auditEnabled && !isModifyMode && canSubmitAudit"
                type="primary"
                :loading="submitting"
                class="flex items-center justify-center"
                @click="handleSubmitAudit"
              >
                <IconifyIcon
                  icon="mdi:file-send-outline"
                  class="mr-1 inline-block size-4 align-middle"
                />
                <span class="align-middle">提交审核</span>
              </Button>
              <Button
                v-if="isEdit && auditEnabled && !isModifyMode && canApplyModify"
                type="primary"
                ghost
                @click="enterModifyMode"
              >
                <IconifyIcon
                  icon="mdi:file-edit-outline"
                  class="mr-1 inline-block size-4 align-middle"
                />
                <span class="align-middle">申请修改</span>
              </Button>
              <Button
                v-if="isEdit && !isModifyMode && canWithdrawSubmit"
                danger
                :loading="submitting"
                class="flex items-center justify-center"
                @click="handleWithdrawSubmit"
              >
                <IconifyIcon
                  icon="mdi:file-undo-outline"
                  class="mr-1 inline-block size-4 align-middle"
                />
                <span class="align-middle">撤销提交</span>
              </Button>
              <Button
                v-if="isEdit && canCancelModifyApply"
                danger
                :loading="submitting"
                class="flex items-center justify-center"
                @click="handleCancelModifyApply"
              >
                <IconifyIcon
                  icon="mdi:file-cancel-outline"
                  class="mr-1 inline-block size-4 align-middle"
                />
                <span class="align-middle">取消申请</span>
              </Button>
              <Button
                :type="isDishonest ? 'default' : 'primary'"
                :danger="!isDishonest"
                @click="handleDishonestToggle"
              >
                {{ isDishonest ? '取消失信' : '加入失信' }}
              </Button>
            </Space>
          </div>
          <div v-if="isAuditMode" class="client-audit-path mx-4 mb-3">
            <div class="client-audit-path__title">审批路径</div>
            <ApprovalPath :instance="auditDetail?.workFlowInstance" />
          </div>
          <div class="content-section__header">
            <span class="card-title">
              <FileText class="size-4" />
              {{ $t('seaExport.export.formCardBasicInfo') }}
            </span>
          </div>
          <div class="content-section__body">
            <div class="mb-2 px-3">
              <!-- 客户：一级勾选 + 二级属性（同行样式，增强区分） -->
              <div
                class="type-row my-2 rounded-lg bg-gray-50 py-2 shadow"
                :class="{
                  'client-audit-section--changed':
                    changedAuditSections.type || changedAuditSections.industry,
                }"
              >
                <div class="type-row__primary">
                  <div
                    class="role-chip"
                    :class="{
                      'role-chip--active': isCustomerType?.includes(1),
                    }"
                  >
                    <CheckboxGroup
                      name="customerTypePrimary"
                      v-model:value="isCustomerType"
                      :disabled="formLocked"
                      :onChange="handleIsClientChange"
                    >
                      <Checkbox :value="1">
                        {{ $t('seaExport.client.clientTypeOptions.customer') }}
                      </Checkbox>
                    </CheckboxGroup>
                  </div>
                </div>
                <div
                  v-if="isCustomerType?.includes(1)"
                  class="type-row__secondary"
                >
                  <CheckboxGroup
                    name="customerIndustry"
                    class="type-row__attr-group"
                    v-model:value="customerType"
                    :disabled="formLocked"
                    :options="
                      ClientConstants.getCustomerIndustryCategoryOptions()
                    "
                  />
                </div>
              </div>

              <!-- 供应商：一级勾选 + 二级属性 -->
              <div
                class="type-row mb-2 rounded-lg bg-gray-50 py-2 shadow"
                :class="{
                  'client-audit-section--changed':
                    changedAuditSections.type || changedAuditSections.industry,
                }"
              >
                <div class="type-row__primary">
                  <div
                    class="role-chip"
                    :class="{
                      'role-chip--active': isSupplierType?.includes(2),
                    }"
                  >
                    <CheckboxGroup
                      name="supplierTypePrimary"
                      v-model:value="isSupplierType"
                      :disabled="formLocked"
                      :onChange="handleIsSupplierChange"
                    >
                      <Checkbox :value="2">
                        {{ $t('seaExport.client.clientTypeOptions.supplier') }}
                      </Checkbox>
                    </CheckboxGroup>
                  </div>
                </div>
                <div
                  v-if="isSupplierType?.includes(2)"
                  class="type-row__secondary"
                >
                  <CheckboxGroup
                    name="supplierIndustry"
                    class="type-row__attr-group"
                    v-model:value="supplierType"
                    :disabled="formLocked"
                    :options="
                      ClientConstants.getSupplierIndustryCategoryOptions()
                    "
                  />
                </div>
              </div>
            </div>
            <BaseForm class="mx-4" />
          </div>
        </section>
      </div>
      <div class="flex gap-3">
        <div class="content-column">
          <section class="content-section">
            <div class="content-section__header">
              <span class="card-title">
                <IconifyIcon
                  icon="material-symbols:business-messages-sharp"
                  class="size-4"
                ></IconifyIcon>
                {{ $t('seaExport.client.smallTitle.Business') }}
              </span>
            </div>
            <div class="content-section__body">
              <BusinessForm class="mx-4" />
            </div>
          </section>
        </div>
        <div class="content-column" v-if="isClient">
          <section class="content-section">
            <div class="content-section__header">
              <span class="card-title">
                <IconifyIcon
                  icon="streamline-ultimate-color:information-desk-customer"
                  class="size-4"
                ></IconifyIcon>
                {{ $t('seaExport.client.smallTitle.info') }}
              </span>
            </div>
            <div class="content-section__body">
              <ClientForm class="mx-4" />
            </div>
          </section>
        </div>
        <div class="content-column" v-if="isSupplier">
          <section class="content-section">
            <div class="content-section__header">
              <span class="card-title">
                <IconifyIcon icon="mdi:factory" class="size-4"></IconifyIcon>
                {{ $t('seaExport.client.smallTitle.supplier') }}
              </span>
            </div>
            <div class="content-section__body">
              <SupplierForm class="mx-4" />
            </div>
          </section>
        </div>
      </div>

      <div class="flex items-stretch gap-3">
        <!-- 地址列略窄于原先，但仍够展示地址卡片（约 1:1.7） -->
        <div
          class="content-column min-w-0 flex-[1]"
          :class="{
            'client-audit-section--changed': changedAuditSections.addresses,
          }"
        >
          <section class="content-section">
            <div class="content-section__header flex justify-between">
              <div>
                <span class="card-title">
                  <IconifyIcon
                    icon="entypo:location-pin"
                    class="size-4"
                  ></IconifyIcon>
                  {{ $t('seaExport.client.smallTitle.address') }}
                </span>
              </div>
              <div class="">
                <Button
                  type="primary"
                  :disabled="formLocked"
                  :loading="submitting"
                  class="flex items-center justify-center"
                  @click="addAddress"
                  size="small"
                >
                  <Plus class="mr-1 inline-block size-4 align-middle" />
                  <span class="align-middle">{{
                    $t('seaExport.client.addAddress')
                  }}</span>
                </Button>
              </div>
            </div>
            <div class="content-section__body address-list">
              <div
                v-for="(item, index) in addressList"
                :key="item.id ?? `${item.name}-${index}`"
                class="address-card cursor-pointer rounded-md border-gray-200 shadow-md transition-all"
                :class="{ 'address-card-default': item.isDefault }"
              >
                <div class="address-heard flex justify-between py-2">
                  <div
                    class="flex min-w-0 flex-wrap items-center font-semibold"
                  >
                    <span class="mr-2 truncate">{{ item.name }}</span>
                    <tag color="blue" v-if="item.isDefault">{{
                      ClientConstants.getDefaultOptions().find(
                        (o) => o.value === item.isDefault,
                      )?.label
                    }}</tag>
                    <tag
                      v-if="
                        item.addressType !== undefined &&
                        item.addressType !== null
                      "
                      color="green"
                      class="ml-2"
                    >
                      {{
                        ClientConstants.getAddressTypeOptions().find(
                          (o) => o.value === item.addressType,
                        )?.label
                      }}
                    </tag>
                  </div>
                  <div class="ml-3 shrink-0">
                    <Button
                      type="text"
                      :disabled="formLocked"
                      @click="editAddress(item)"
                      size="small"
                    >
                      <span class="align-middle">{{ $t('common.edit') }}</span>
                    </Button>
                    <Button
                      type="text"
                      :disabled="formLocked"
                      @click="delAddress(index)"
                      size="small"
                    >
                      <span class="align-middle">{{
                        $t('common.delete')
                      }}</span>
                    </Button>
                  </div>
                </div>
                <div class="address-content flex flex-col">
                  <div class="address-item flex space-x-2 py-1">
                    <span class="pt-1">
                      <IconifyIcon
                        icon="mdi:location"
                        width="1.2em"
                        height="1.2em"
                        style="color: #109ae8"
                      />
                    </span>
                    <span class="text-normal break-words">{{
                      item.address
                    }}</span>
                  </div>
                  <div class="flex flex-wrap gap-x-4 gap-y-1">
                    <span class="flex items-start space-x-2">
                      <span class="pt-1">
                        <IconifyIcon icon="mdi:user" style="color: #ced3dd" />
                      </span>
                      <span class="text-sm text-gray-500">
                        {{ item.contactPerson }}
                      </span>
                    </span>
                    <span class="flex items-start space-x-2">
                      <span class="pt-1">
                        <IconifyIcon
                          icon="mdi:telephone"
                          style="color: #ced3dd"
                        />
                      </span>
                      <span class="text-sm text-gray-500">{{
                        item.mobile
                      }}</span>
                    </span>
                  </div>
                </div>
              </div>
            </div>
          </section>
        </div>
        <div
          class="content-column min-w-0 flex-[1.7]"
          :class="{
            'client-audit-section--changed':
              changedAuditSections.billingPeriods,
          }"
        >
          <section class="content-section">
            <div class="content-section__header">
              <span class="card-title">
                <IconifyIcon icon="mdi:calendar-clock" class="size-4" />
                {{ $t('seaExport.client.paymentTerms.title') }}
              </span>
            </div>
            <div class="content-section__body">
              <PaymentTermsPanel
                v-model="billingPeriods"
                :readonly="formLocked"
              />
            </div>
          </section>
        </div>
      </div>
    </div>

    <Card
      class="right-column stakeholders-panel mr-2"
      :class="{
        'client-audit-section--changed': changedAuditSections.stakeholders,
      }"
    >
      <template #title>
        <span class="card-title">
          <span class="stakeholders-panel__title-icon" aria-hidden="true">
            <IconifyIcon icon="gridicons:multiple-users" class="size-4" />
          </span>
          {{ $t('seaExport.client.stakeholders') }}
        </span>
      </template>

      <div class="stakeholders-panel__body">
        <div class="stakeholders-panel__group">
          <div class="stakeholders-panel__group-label">业务干系人</div>
          <div
            v-for="item in defaultOrderUsers"
            :key="item.userAttribute"
            class="stakeholder-block"
            :class="{
              'stakeholder-block--filled': getStakeholderCount(item) > 0,
            }"
          >
            <div class="stakeholder-block__head">
              <span class="stakeholder-block__icon" aria-hidden="true">
                <IconifyIcon
                  :icon="getOrderUserRoleIcon(item.userAttribute)"
                  class="size-3.5"
                />
              </span>
              <span class="stakeholder-block__title">
                {{ getOrderUserRoleLabel(item.userAttribute) }}
              </span>
              <span class="stakeholder-block__count">
                {{ getStakeholderCount(item) }}
              </span>
            </div>
            <UserSelect
              mode="multiple"
              :disabled="formLocked"
              :model-value="item.userIds"
              label-key="nickName"
              :user-attribute="item.userAttribute"
              :selected-items="toUserSelectSelectedItems(item.stakeholderList)"
              class="stakeholder-block__select"
              @update:model-value="
                (v) => updateStakeholders(item.userAttribute, v as number[])
              "
            />
          </div>
        </div>

        <div class="stakeholders-panel__divider" role="separator"></div>

        <div class="stakeholders-panel__group">
          <div class="stakeholders-panel__group-label">结算对账</div>
          <div
            class="stakeholder-block stakeholder-block--reconciler"
            :class="{
              'stakeholder-block--filled': reconcilerUserIds.length > 0,
            }"
          >
            <div class="stakeholder-block__head">
              <span class="stakeholder-block__icon" aria-hidden="true">
                <IconifyIcon
                  icon="mdi:file-table-box-outline"
                  class="size-3.5"
                />
              </span>
              <span class="stakeholder-block__title">对账人</span>
              <span class="stakeholder-block__count">
                {{ reconcilerUserIds.length }}
              </span>
            </div>
            <UserSelect
              mode="multiple"
              :disabled="formLocked"
              :model-value="reconcilerUserIds"
              label-key="nickName"
              :selected-items="toUserSelectSelectedItems(reconcilerList)"
              class="stakeholder-block__select"
              @update:model-value="updateReconcilers($event as number[])"
            />
          </div>
        </div>
      </div>
    </Card>

    <AddressModalComponent @add="addAddressData" @edit="editAddressData" />
    <RiskbirdModal
      width="1200px"
      height="700px"
      title="企业查询"
      :footer="false"
      @import="handleRiskbirdImport"
    />
    <TransferModalComp @success="onAuditTransferSuccess" />
  </div>
</template>

<style scoped lang="scss">
.right-column {
  flex-shrink: 0;
  width: 280px;
  overflow: hidden;
  background: hsl(var(--card));
  border: 1px solid hsl(var(--border));
  border-radius: 10px;
  box-shadow: 0 1px 3px rgb(0 0 0 / 5%);

  :deep(.ant-card-head) {
    min-height: 44px;
    padding: 0 14px;
    background: linear-gradient(
      90deg,
      hsl(var(--primary) / 8%) 0%,
      hsl(var(--primary) / 3%) 70%,
      hsl(var(--background)) 100%
    );
    border-bottom: 1px solid hsl(var(--border));
  }

  :deep(.ant-card-head-title) {
    padding: 10px 0;
  }

  :deep(.ant-card-body) {
    padding: 12px !important;
  }
}

.stakeholders-panel__title-icon {
  display: inline-flex;
  flex-shrink: 0;
  align-items: center;
  justify-content: center;
  width: 24px;
  height: 24px;
  color: hsl(var(--primary));
  background: hsl(var(--primary) / 12%);
  border-radius: 6px;
}

.stakeholders-panel__body {
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.stakeholders-panel__group {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.stakeholders-panel__group-label {
  padding-left: 2px;
  font-size: 11px;
  font-weight: 600;
  line-height: 1;
  color: hsl(var(--muted-foreground));
  letter-spacing: 0.04em;
}

.stakeholders-panel__divider {
  height: 1px;
  margin: 2px 0;
  background: linear-gradient(
    90deg,
    hsl(var(--primary) / 28%) 0%,
    hsl(var(--border)) 55%,
    transparent 100%
  );
}

.stakeholder-block {
  display: flex;
  flex-direction: column;
  gap: 8px;
  padding: 10px;
  background: hsl(var(--accent) / 45%);
  border: 1px solid hsl(var(--border));
  border-radius: 8px;
  transition:
    border-color 0.2s ease,
    background-color 0.2s ease,
    box-shadow 0.2s ease;

  &:hover {
    background: hsl(var(--primary) / 5%);
    border-color: hsl(var(--primary) / 35%);
    box-shadow: 0 2px 8px hsl(var(--primary) / 8%);
  }

  &:focus-within {
    background: hsl(var(--primary) / 6%);
    border-color: hsl(var(--primary) / 55%);
    box-shadow: 0 0 0 2px hsl(var(--primary) / 12%);
  }
}

.stakeholder-block--filled {
  background: hsl(var(--primary) / 4%);
  border-color: hsl(var(--primary) / 22%);
}

.stakeholder-block--reconciler {
  background: hsl(var(--muted) / 55%);

  &:hover,
  &:focus-within {
    background: hsl(var(--primary) / 5%);
  }

  &.stakeholder-block--filled {
    background: hsl(var(--primary) / 4%);
  }
}

.stakeholder-block__head {
  display: flex;
  gap: 8px;
  align-items: center;
  min-width: 0;
}

.stakeholder-block__icon {
  display: inline-flex;
  flex-shrink: 0;
  align-items: center;
  justify-content: center;
  width: 24px;
  height: 24px;
  color: hsl(var(--primary));
  background: hsl(var(--primary) / 12%);
  border-radius: 6px;
}

.stakeholder-block__title {
  flex: 1;
  min-width: 0;
  overflow: hidden;
  text-overflow: ellipsis;
  font-size: 13px;
  font-weight: 600;
  line-height: 1.2;
  color: hsl(var(--foreground));
  white-space: nowrap;
}

.stakeholder-block__count {
  display: inline-flex;
  flex-shrink: 0;
  align-items: center;
  justify-content: center;
  min-width: 20px;
  height: 18px;
  padding: 0 6px;
  font-size: 11px;
  font-weight: 600;
  line-height: 1;
  color: hsl(var(--muted-foreground));
  background: hsl(var(--background));
  border: 1px solid hsl(var(--border));
  border-radius: 9px;
}

.stakeholder-block--filled .stakeholder-block__count {
  color: hsl(var(--primary));
  background: hsl(var(--primary) / 10%);
  border-color: hsl(var(--primary) / 22%);
}

.stakeholder-block__select {
  width: 100%;
}

.text-sm {
  font-size: 12px;
}

.border-b-grey {
  border-bottom: 1px solid #e8e8e8;
}

.main-layout {
  display: flex;
  gap: 14px;
  //padding: 12px;
}

.lineheight-32 {
  line-height: 32px;
}

/* 客户/供应商两行布局：一级勾选加粗高亮，二级属性弱化区分 */
.type-row {
  display: flex;
  flex-wrap: wrap;
  gap: 6px 12px;
  align-items: center;
  padding: 6px 10px;
}

.type-row__primary {
  display: inline-flex;
  flex-shrink: 0;
  gap: 8px;
  align-items: center;
}

.type-row__label {
  font-size: 13px;
  font-weight: 700;
  color: #1a2332;
  white-space: nowrap;
}

/* 一级：客户 / 供应商 胶囊芯片 */
.role-chip {
  display: inline-flex;
  align-items: center;
  min-height: 28px;
  padding: 1px 10px;
  user-select: none;
  background: #fff;
  border: 1.5px solid #d0d7e2;
  border-radius: 999px;
  transition:
    border-color 0.15s ease,
    background 0.15s ease,
    box-shadow 0.15s ease;

  &:hover {
    border-color: #91caff;
  }

  :deep(.ant-checkbox-wrapper) {
    font-size: 13px;
    font-weight: 600;
    color: #252a31;
  }

  :deep(.ant-checkbox-inner) {
    width: 14px;
    height: 14px;
    border-radius: 3px;
  }

  :deep(.ant-checkbox + span) {
    padding-inline: 6px;
  }
}

.role-chip--active {
  background: linear-gradient(
    135deg,
    hsl(var(--primary) / 10%) 0%,
    hsl(var(--primary) / 8%) 100%
  );
  border-color: hsl(var(--primary));
  box-shadow: 0 0 0 2px hsl(var(--primary) / 12%);

  :deep(.ant-checkbox-wrapper) {
    color: hsl(var(--primary));
  }

  :deep(.ant-checkbox-checked .ant-checkbox-inner) {
    background-color: hsl(var(--primary));
    border-color: hsl(var(--primary));
  }
}

.type-row__secondary {
  display: flex;
  flex: 1;
  flex-wrap: wrap;
  align-items: center;
  min-width: 0;
  padding: 2px 8px;
  margin-left: 4px;
  background: #fff;
  border: 1px dashed #d9e2ec;
  border-radius: 4px;
}

.type-row__attr-group {
  :deep(.ant-checkbox-wrapper) {
    margin-inline-end: 10px;
    font-size: 12px;
    font-weight: 400;
    line-height: 24px;
    color: #64748b;
  }

  :deep(.ant-checkbox-inner) {
    width: 13px;
    height: 13px;
  }
}

.center-column {
  display: flex;
  flex: 1;
  flex-direction: column;
  gap: 14px;
  min-width: 0;
}

.content-column {
  display: flex;
  flex-direction: column;
  gap: 0;
  overflow: hidden;
  background: #fff;
  border: 1px solid #e8e8e8;
  border-radius: 10px;
}

.content-section {
  padding: 0;
}

.content-section__header {
  padding: 12px 18px 8px;
  padding-bottom: 5px;
  margin-bottom: 5px;
  background: linear-gradient(
    90deg,
    hsl(var(--primary) / 8%) 0%,
    hsl(var(--primary) / 3%) 70%,
    hsl(var(--background)) 100%
  );
  border-bottom: 1px solid #e8e8e8;
}

.content-section__body {
  padding: 0 18px 14px;
}

.content-section__actions {
  display: flex;
  gap: 12px;
  align-items: center;
  justify-content: space-between;
  padding: 10px 18px;
  border-bottom: 1px solid #edf2f7;
}

.content-section__status {
  display: flex;
  flex: 1;
  flex-wrap: wrap;
  gap: 8px;
  align-items: center;
  min-width: 0;
}

.content-section__status-hint {
  font-size: 12px;
  line-height: 1.4;
  color: #f97316;
}

.client-audit-path {
  padding: 10px 12px;
  background: hsl(var(--primary) / 3%);
  border: 1px solid hsl(var(--border));
  border-radius: 8px;
}

.client-audit-path__title {
  margin-bottom: 8px;
  font-size: 12px;
  font-weight: 600;
  color: hsl(var(--foreground) / 80%);
}

/* 申请修改：有改动的字段/区块用独立色标出 */
:deep(.client-audit-field--changed) {
  padding: 4px 6px;
  outline: 1px solid hsl(32deg 90% 48% / 35%);
  background: hsl(38deg 96% 92%);
  border-radius: 6px;
}

:deep(.client-audit-field--changed .ant-form-item-label > label) {
  color: hsl(28deg 80% 36%);
}

.client-audit-section--changed {
  padding: 4px;
  outline: 1px solid hsl(32deg 90% 48% / 30%);
  background: hsl(38deg 96% 94%);
  border-radius: 8px;
}

.card-title {
  display: flex;
  gap: 8px;
  align-items: center;
  font-size: 13px;
  font-weight: 600;
  color: hsl(var(--primary));
}

.card-body {
  padding: 0 4px;
}

.address-list {
  display: flex;
  flex-direction: column;
  gap: 12px;
  padding-top: 4px;
  padding-bottom: 16px;
}

.address-card {
  width: 100%;
  padding: 10px 14px 12px;
  border: 1px solid #e8edf3;

  &:hover {
    background: linear-gradient(
      to right,
      hsl(var(--primary) / 9%),
      hsl(var(--background))
    );
    border: 1px solid hsl(var(--primary) / 55%);
  }

  .address-heard {
    margin-bottom: 4px;
    border-bottom: 1px solid #edf2f7;
  }

  .address-content {
    gap: 4px;
    padding-top: 2px;
  }
}

.address-card-default {
  background: linear-gradient(
    to right,
    hsl(var(--primary) / 9%),
    hsl(var(--background))
  );
}
</style>
