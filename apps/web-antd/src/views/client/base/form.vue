<script lang="ts" setup>
import { computed, nextTick, onMounted, ref, watch, markRaw, h } from 'vue';
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
  Select,
  Tag,
} from 'ant-design-vue';
import type { SystemUserAdminApi } from '#/api/system/user-admin';

import { useVbenForm } from '#/adapter/form';
import { getAreaAndParents } from '#/api/common/area';
import AddressModal from './address-modal.vue';
import RiskbirdSearchModal from './riskbird-search-modal.vue';
import { useVbenModal } from '@vben/common-ui';
import type { ClientAdminApi } from '#/api/sea-export/client-admin';
import { getUser, UserAttribute, UserStatus } from '#/api/system/user-admin';
import dayjs from 'dayjs';
import { pinyin } from 'pinyin-pro';
import {
  ArrowLeft,
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
  editClient,
  getClientDetail,
  addDishonest,
  cancelDishonest,
} from '#/api/sea-export/client-admin';
import { $t } from '#/locales';
import { markListShouldRefresh } from '#/utils/list-refresh-flag';
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

const route = useRoute();
const router = useRouter();

const editId = computed<string | undefined>(() => {
  const id = route.params.id;
  if (Array.isArray(id)) return id[0];
  return id ? String(id) : undefined;
});

const isEdit = computed(() => !!editId.value);

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
const defaultOrderUsers = ref<ClientAdminApi.ClientStakeholderListDto[]>([
  { userAttribute: UserAttribute.Sales, stakeholderList: [] },
  { userAttribute: UserAttribute.Operation, stakeholderList: [] },
  { userAttribute: UserAttribute.CustomerService, stakeholderList: [] },
  { userAttribute: UserAttribute.Documentation, stakeholderList: [] },
]);

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

const [AddressModalComponent, modalApi] = useVbenModal({
  // 连接抽离的组件
  connectedComponent: AddressModal,
});

/** 风鸟企业查询弹窗 */
const [RiskbirdModal, riskbirdModalApi] = useVbenModal({
  connectedComponent: RiskbirdSearchModal,
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
  console.log('openRiskbirdSearch - 开始');

  // 获取当前表单中的全称
  const values = await baseFormApi.getValues();
  const fullName = values.fullName;

  console.log('openRiskbirdSearch - fullName:', fullName);
  console.log('openRiskbirdSearch - editId.value:', editId.value);

  if (!fullName) {
    message.warning('请先输入客户全称');
    return;
  }

  // 设置搜索关键字为当前全称，并传入clientId（编辑模式用于回写）
  console.log('准备打开弹窗，传递数据:', {
    searchKeyword: fullName,
    clientId: editId.value,
  });

  riskbirdModalApi
    .setData({
      searchKeyword: fullName, // 传递搜索关键字
      clientId: editId.value, // 编辑模式传入clientId用于回写
    })
    .open();

  console.log('弹窗已打开');
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

    console.log('开始导入风鸟数据:', detail);

    // 1. 统一社会信用代码 -> taxNo（新字段：creditCode）
    if (detail.creditCode) {
      updateData.taxNo = detail.creditCode;
      console.log('导入税号:', detail.creditCode);
    } else if (detail.uniscid) {
      // 兼容旧字段
      updateData.taxNo = detail.uniscid;
      console.log('导入税号(旧字段):', detail.uniscid);
    }

    // 2. 法定代表人 -> legalPerson（新字段：legalPerson）
    if (detail.legalPerson) {
      updateData.legalPerson = detail.legalPerson;
      console.log('导入法人:', detail.legalPerson);
    } else if (detail.personName) {
      // 兼容旧字段
      updateData.legalPerson = detail.personName;
      console.log('导入法人(旧字段):', detail.personName);
    }

    // 3. 注册资本 -> registeredCapital（新字段：raw.regCap）
    if (detail.raw?.regCap) {
      updateData.registeredCapital = detail.raw.regCap;
      console.log('导入注册资本:', detail.raw.regCap);
    } else if (detail.regConcat) {
      // 兼容旧字段
      updateData.registeredCapital = detail.regConcat;
      console.log('导入注册资本(旧字段):', detail.regConcat);
    }

    // 4. 成立日期 -> establishmentDate（新字段：raw.esDate）
    const esDate = detail.raw?.esDate || detail.esDate;
    if (esDate) {
      const establishmentDate = parseRiskbirdDate(esDate);
      if (establishmentDate) {
        updateData.establishmentDate = dayjs(establishmentDate);
        console.log('导入成立日期:', establishmentDate);
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
        console.log(
          '导入营业期限:',
          businessTerm,
          '(from:',
          operateFrom,
          ', to:',
          operateTo,
          ')',
        );
      }
    }

    // 6. 注册地址 -> address（新字段：address）
    if (detail.address) {
      updateData.address = detail.address;
      console.log('导入地址:', detail.address);
    } else if (detail.dom || detail.regAddr) {
      // 兼容旧字段
      updateData.address = detail.dom || detail.regAddr;
      console.log('导入地址(旧字段):', detail.dom || detail.regAddr);
    }

    // 7. 英文名称 -> enName
    if (detail.raw?.entNameEn || detail.enterpriseNameEng) {
      updateData.enName = detail.raw?.entNameEn || detail.enterpriseNameEng;
      console.log(
        '导入英文名称:',
        detail.raw?.entNameEn || detail.enterpriseNameEng,
      );
    }

    // 8. 电话 -> phone（新字段：phone）
    if (detail.phone) {
      updateData.phone = detail.phone;
      console.log('导入电话:', detail.phone);
    } else if (detail.tel) {
      // 兼容旧字段
      updateData.phone = detail.tel;
      console.log('导入电话(旧字段):', detail.tel);
    }

    // 9. 官网 -> url
    if (detail.website) {
      updateData.url = detail.website;
      console.log('导入官网:', detail.website);
    }

    // 10. 邮箱 -> email
    if (detail.email) {
      updateData.email = detail.email;
      console.log('导入邮箱:', detail.email);
    }

    // 11. 名称 -> name
    if (detail.name) {
      updateData.name = detail.name;
      updateData.fullName = detail.name; // 同步更新全称
      console.log('导入名称:', detail.name);
    }

    console.log('准备更新的字段:', updateData);

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

      console.log('导入地址信息:', newAddress);

      // 如果设置为默认地址，先取消其他地址的默认状态
      if (shouldSetDefault) {
        addressList.value.forEach((item) => {
          item.isDefault = false;
        });
      }

      // 添加地址到列表
      addressList.value.push(newAddress);
      console.log('地址已添加到列表，当前地址数量:', addressList.value.length);

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
  console.log('industryCategoriesArray', industryCategoriesArray);
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

  return {
    // 基础信息表单
    name: detail.name,
    fullName: detail.fullName,
    code: detail.code,
    enName: detail.enName,
    taxNo: detail.taxNo,
    codeSourceId: detail.codeSourceId,
    phone: detail.phone,
    mobile: detail.mobile,
    email: detail.email,
    url: detail.url,
    enterpriseType: detail.enterpriseType, // 添加企业类型字段
    orgId: detail.orgId, // 归属组织字段
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

/**
 * 加载编辑数据
 */
const loadEditData = async () => {
  if (!editId.value) return;

  pageLoading.value = true;
  try {
    const detail = await getClientDetail(editId.value);
    const formValues = await mapDetailToFormValues(detail);

    // 设置各个表单的值
    await baseFormApi.setValues(formValues);
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
  } catch (error) {
    console.error('加载编辑数据失败:', error);
    //message.error($t('common.loadFailed'));
  } finally {
    pageLoading.value = false;
  }
};
const handleClientTypeChange = (checkedValues: any[]) => {
  console.log('handleClientTypeChange', checkedValues);
};

const handleIsClientChange = (e: any) => {
  const checked = e.includes(1);
  isClient.value = checked;
  if (!checked) {
    // 取消客户类型时，清空客户的行业类别选择
    customerType.value = [];
  }
  console.log('isClient.value', isClient.value);
  console.log('customerType.value', customerType.value);
};

const handleIsSupplierChange = (e: any) => {
  const checked = e.includes(2);
  isSupplier.value = checked;
  if (!checked) {
    // 取消供应商类型时，清空供应商的行业类别选择
    supplierType.value = [];
  }
  console.log('isSupplier.value', isSupplier.value);
  console.log('supplierType.value', supplierType.value);
};

/**
 * 更新干系人列表
 */
const updateStakeholders = async (
  userAttribute: number | undefined,
  values: number[],
) => {
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

            console.log(
              '✅ [销售联动] 已自动设置所属公司为:',
              companyOrg.name,
              '(ID:',
              companyOrg.id,
              ')',
            );
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
  reconcilerUserIds.value = values;
};

/**
 * 提交表单
 */
const handleSubmit = async () => {
  try {
    submitting.value = true;

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

    if (!businessValid) {
      message.warning($t('ui.formRules.pleaseCompleteRequiredFields'));
      return;
    }

    // 如果是客户类型，额外校验客户性质是否已选择
    if (isClient.value) {
      const clientValuesCheck = await clientFormApi.getValues();
      console.log('🔍 客户表单值:', clientValuesCheck);
      console.log(
        '🔍 clientType 值:',
        clientValuesCheck.clientType,
        '类型:',
        typeof clientValuesCheck.clientType,
      );

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
      console.log('✅ 客户性质已选择:', clientValuesCheck.clientType);
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

    console.log('📋 表单值汇总:', {
      baseValues,
      businessValues,
      clientValues,
      supplierValues,
      isClient: isClient.value,
      isSupplier: isSupplier.value,
    });

    let createdId: any;

    // 处理行业类别：将数组转换为字符串
    const industryCategories = [
      ...new Set([
        ...(customerType.value || []),
        ...(supplierType.value || []),
      ]),
    ].join('');
    console.log('customerType.value', customerType.value);
    console.log('supplierType.value', supplierType.value);
    console.log('industryCategories', industryCategories);

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
        industryCategories,
        codeSourceId: baseValues.codeSourceId,
        remark: baseValues.remark,
        enFullName: baseValues.enFullName,
        taxNo: baseValues.taxNo,
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
        // 对账人用户ID列表
        reconcilerUserIds: reconcilerUserIds.value,
      };
      createdId = await editClient(editData);
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
        industryCategories,
        codeSourceId: baseValues.codeSourceId,
        remark: baseValues.remark,
        enFullName: baseValues.enFullName,
        taxNo: baseValues.taxNo,
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
        // 对账人用户ID列表
        reconcilerUserIds: reconcilerUserIds.value,
      };

      console.log('📤 新增模式提交数据:', {
        clientType: addData.clientType,
        isClient: addData.isClient,
        name: addData.name,
        fullName: addData.fullName,
      });

      createdId = await addClient(addData);
      const resolvedCreatedId =
        (createdId as any)?.id ?? (createdId as any)?.result ?? createdId;
      const createdIdStr =
        resolvedCreatedId === null || resolvedCreatedId === undefined
          ? ''
          : String(resolvedCreatedId).trim();
      if (createdIdStr) {
        router.push(`/clients/${createdIdStr}/edit`);
      } else {
        router.push('/clients');
      }
    }

    if (createdId) {
      message.success($t('ui.actionMessage.operationSuccess'));
      markListShouldRefresh('ClientList');

      //router.push('/clients');
    } else {
      // message.success($t('ui.actionMessage.operationFailed'));
    }
  } catch (error: any) {
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
 * 取消返回
 */
const handleCancel = () => {
  router.push('/clients');
};

/**
 * 添加地址
 */
const addAddress = () => {
  modalApi.setData(null).open();
};
/**
 * 编辑地址
 */
const editAddress = (data: ClientAdminApi.ClientAddressEditDto) => {
  modalApi.setData(data).open();
};
const addressList = ref<ClientAdminApi.ClientAddressEditDto[]>([]);

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

  console.log('edit-addressList.value', addressList.value);
};

/**
 * 删除地址
 */
const delAddress = (index: number) => {
  addressList.value = addressList.value.filter((_, i) => i !== index);
};

onMounted(() => {
  loadEditData();

  // 在表单初始化后，为fullName字段添加onChange监听和查询按钮
  // 使用setTimeout确保表单完全渲染后再添加按钮
  setTimeout(() => {
    console.log('isEdit.value:', isEdit.value);
    console.log('editId.value:', editId.value);

    if (!isEdit.value) {
      console.log('新增模式：添加风鸟查询按钮');
      baseFormApi.updateSchema([
        {
          fieldName: 'fullName',
          suffix: () => {
            return h(
              Button,
              {
                type: 'link',
                size: 'small',
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
              console.log('newFullName', newFullName);
            },
          },
        },
      ]);
    } else {
      // 编辑模式也添加查询按钮，但不需要onChange监听
      console.log('编辑模式：添加风鸟查询按钮');
      baseFormApi.updateSchema([
        {
          fieldName: 'fullName',
          suffix: () => {
            return h(
              Button,
              {
                type: 'link',
                size: 'small',
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
  }, 100); // 延迟100ms确保表单完全渲染
});
</script>

<template>
  <div class="main-layout mb-2">
    <div class="center-column ml-2">
      <div class="content-column">
        <section :ref="sectionRefs.basic" class="content-section">
          <div class="content-section__actions">
            <Space>
              <Button @click="handleCancel">
                {{ $t('common.back') }}
              </Button>
              <Button
                type="primary"
                :loading="submitting"
                class="flex items-center justify-center"
                @click="handleSubmit"
              >
                <Save class="mr-1 inline-block size-4 align-middle" />
                <span class="align-middle">{{ $t('common.save') }}</span>
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
          <div class="content-section__header">
            <span class="card-title">
              <FileText class="size-4" />
              {{ $t('seaExport.export.formCardBasicInfo') }}
            </span>
          </div>
          <div class="content-section__body">
            <div class="mb-2">
              <div class="my-2 rounded-lg bg-gray-50 py-2 shadow">
                <span class="ml-3 mr-6 font-extrabold">{{
                  $t('seaExport.client.smallTitle.customerType')
                }}</span>
                <CheckboxGroup
                  name="CheckboxGroup"
                  v-model:value="isCustomerType"
                  :onChange="handleIsClientChange"
                  class="mr-5"
                >
                  <Checkbox :value="1" class="lineheight-32">
                    {{ $t('seaExport.client.clientTypeOptions.customer') }}
                  </Checkbox>
                </CheckboxGroup>
                <CheckboxGroup
                  name="CheckboxGroup"
                  v-if="isCustomerType?.includes(1)"
                  v-model:value="customerType"
                  :options="
                    ClientConstants.getCustomerIndustryCategoryOptions()
                  "
                />
              </div>
              <div class="mb-4 mt-2 rounded-lg bg-gray-50 py-2 shadow">
                <span class="mx-3 font-extrabold">{{
                  $t('seaExport.client.smallTitle.supplierType')
                }}</span>
                <CheckboxGroup
                  name="CheckboxGroup"
                  class="mr-1"
                  v-model:value="isSupplierType"
                  :onChange="handleIsSupplierChange"
                >
                  <Checkbox :value="2" class="lineheight-32">
                    {{ $t('seaExport.client.clientTypeOptions.supplier') }}
                  </Checkbox>
                </CheckboxGroup>
                <CheckboxGroup
                  name="CheckboxGroup"
                  v-if="isSupplierType?.includes(2)"
                  v-model:value="supplierType"
                  :options="
                    ClientConstants.getSupplierIndustryCategoryOptions()
                  "
                />
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

      <div class="content-column">
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
          <div class="content-section__body flex space-x-2">
            <div
              v-for="(item, index) in addressList"
              class="address-card mt-2 w-[450px] cursor-pointer rounded-md border-gray-200 p-2 shadow-md transition-all"
              :class="{ 'address-card-default': item.isDefault }"
            >
              <div class="address-heard flex justify-between py-2">
                <div class="flex font-semibold">
                  <span class="mr-2">{{ item.name }}</span>
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
                <div>
                  <Button type="text" @click="editAddress(item)" size="small">
                    <span class="align-middle">{{ $t('common.edit') }}</span>
                  </Button>
                  <Button type="text" @click="delAddress(index)" size="small">
                    <span class="align-middle">{{ $t('common.delete') }}</span>
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
                  <span class="text-normal">{{ item.address }}</span>
                </div>
                <div class="flex space-x-2">
                  <span class="pt-1">
                    <IconifyIcon icon="mdi:user" style="color: #ced3dd" />
                  </span>
                  <span class="text-sm text-gray-500">
                    {{ item.contactPerson }}
                  </span>
                  <span class="pt-1">
                    <IconifyIcon icon="mdi:telephone" style="color: #ced3dd" />
                  </span>
                  <span class="text-sm text-gray-500">{{ item.mobile }}</span>
                </div>
              </div>
            </div>
          </div>
        </section>
      </div>
    </div>

    <Card class="right-column mr-2 w-[260px] rounded-md shadow-md">
      <template #title>
        <span class="card-title">
          <IconifyIcon
            icon="gridicons:multiple-users"
            class="size-4"
          ></IconifyIcon>
          {{ $t('seaExport.client.stakeholders') }}
        </span>
      </template>
      <div
        v-for="(item, index) in defaultOrderUsers"
        :key="item.userAttribute"
        class="stakeholders-content w-full space-y-2 rounded-lg border border-gray-100 bg-gray-50 p-3 shadow"
      >
        <div class="font-semibold">
          {{ getOrderUserRoleLabel(item.userAttribute) }}
        </div>
        <div>
          <UserSelect
            :mode="'multiple'"
            :model-value="item.userIds"
            labelKey="nickName"
            :user-attribute="item.userAttribute"
            @update:model-value="
              (v) => updateStakeholders(item.userAttribute, v as number[])
            "
          >
          </UserSelect>
        </div>
      </div>

      <!-- 对账人区域 -->
      <div
        class="stakeholders-content mt-2 w-full space-y-2 rounded-lg border border-gray-100 bg-gray-50 p-3 shadow"
      >
        <div class="font-semibold">对账人</div>
        <div>
          <UserSelect
            mode="multiple"
            :model-value="reconcilerUserIds"
            labelKey="nickName"
            @update:model-value="updateReconcilers($event as number[])"
          />
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
  </div>
</template>

<style scoped lang="scss">
.right-column {
  :deep(.ant-card-body) {
    padding: 10px !important;
  }
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
  border-bottom: 1px solid #e8e8e8;
}

.content-section__body {
  padding: 0 18px 14px;
}

.content-section__actions {
  display: flex;
  justify-content: flex-end;
  padding: 10px 18px;
  border-bottom: 1px solid #edf2f7;
}

.card-title {
  display: flex;
  gap: 8px;
  align-items: center;
  font-size: 13px;
  font-weight: 600;
  color: #1677ff;
}

.card-body {
  padding: 0 4px;
}

.address-card {
  border: #1677ff00 1px solid;

  &:hover {
    background: linear-gradient(to right, #1677ff18, #fff);
    border: #0668f1 1px solid;
  }

  .address-heard {
    border-bottom: 1px solid #edf2f7;
  }
}

.address-card-default {
  background: linear-gradient(to right, #1677ff18, #fff);
}
</style>
