<script lang="ts" setup>
import { ref, nextTick } from 'vue';
import { useVbenModal } from '@vben/common-ui';
import { Button, Table, Spin, message } from 'ant-design-vue';
import {
  searchCompanyAsync,
  getCompanyDetailAsync,
  type RiskbirdApi,
} from '#/api/riskbird/riskbird';
import dayjs from 'dayjs';

const emit = defineEmits<{
  (e: 'import', data: RiskbirdApi.RiskbirdCompanyDetailDto): void;
}>();

// 搜索结果列表
const searchResults = ref<RiskbirdApi.RiskbirdCompanySearchResultDto[]>([]);
// 当前选中的公司详情
const selectedCompanyDetail = ref<RiskbirdApi.RiskbirdCompanyDetailDto | null>(
  null,
);
// 加载状态
const searching = ref(false);
const detailLoading = ref(false);

/**
 * 弹窗打开时的回调
 */
const [Modal, modalApi] = useVbenModal({
  onOpenChange(isOpen) {
    console.log('onOpenChange - isOpen:', isOpen);

    if (isOpen) {
      // 使用 modalApi.getData() 获取传递的数据
      const data = modalApi.getData<{
        searchKeyword?: string;
        clientId?: string;
      }>();
      console.log('onOpenChange - data:', data);

      if (data?.searchKeyword) {
        // 弹窗打开时，自动执行搜索
        console.log('准备执行搜索，关键字:', data.searchKeyword);
        nextTick(() => {
          handleSearch(data.searchKeyword || '');
        });
      }
    } else {
      // 弹窗关闭时，清空搜索状态
      searchResults.value = [];
      selectedCompanyDetail.value = null;
    }
  },
});

/**
 * 解析日期字符串
 */
const parseDate = (dateStr: string | undefined): string => {
  if (!dateStr) return '';
  const date = dayjs(dateStr);
  return date.isValid() ? date.format('YYYY-MM-DD') : '';
};

/**
 * 格式化营业期限
 */
const formatBusinessTerm = (
  opFrom: number | undefined,
  opTo: number | undefined,
): string => {
  if (!opFrom && !opTo) return '';

  const fromDate = opFrom ? dayjs(opFrom).format('YYYY-MM-DD') : '';
  const toDate = opTo ? dayjs(opTo).format('YYYY-MM-DD') : '长期';

  if (fromDate) {
    return `${fromDate} 至 ${toDate}`;
  }

  return '';
};

/**
 * 搜索企业
 */
const handleSearch = async (keyword: string) => {
  console.log('handleSearch - keyword:', keyword);

  if (!keyword) {
    message.warning('请输入搜索关键字');
    return;
  }

  searching.value = true;
  searchResults.value = [];
  selectedCompanyDetail.value = null;

  try {
    console.log('开始调用API，参数:', { Keyword: keyword });
    const response = await searchCompanyAsync({ Keyword: keyword });
    console.log('API响应:', response);

    // 后端直接返回 PagedList 结构 { items: [...] }，没有外层包装
    if (response?.items) {
      searchResults.value = response.items;
      console.log('搜索结果数量:', searchResults.value.length);

      if (searchResults.value.length === 0) {
        message.info('未找到相关企业');
      }
    } else {
      console.error('数据格式异常，完整响应:', response);
      message.error('数据格式异常');
    }
  } catch (error: any) {
    console.error('搜索失败:', error);
    message.error(error?.message || '搜索失败');
  } finally {
    searching.value = false;
  }
};

/**
 * 选择公司并获取详情
 */
const handleSelectCompany = async (company: any) => {
  detailLoading.value = true;

  try {
    const detailData: RiskbirdApi.RiskbirdCompanyDetailInputDto = {
      CompanyId: company.entId, // 使用entId而不是id
    };

    // 使用 modalApi.getData() 获取传递的数据
    const data = modalApi.getData<{
      searchKeyword?: string;
      clientId?: string;
    }>();
    // 如果传入了clientId，回写工商信息到客户表
    if (data?.clientId) {
      detailData.ClientId = data.clientId;
    }

    const detail = await getCompanyDetailAsync(detailData);
    selectedCompanyDetail.value = detail;
  } catch (error: any) {
    console.error('获取详情失败:', error);
    message.error(error?.message || '加载失败');
  } finally {
    detailLoading.value = false;
  }
};

/**
 * 确定导入
 */
const handleImport = () => {
  if (!selectedCompanyDetail.value) {
    message.warning('请先选择一个公司');
    return;
  }

  emit('import', selectedCompanyDetail.value);
};

// 表格列定义
const columns = [
  {
    title: '#',
    dataIndex: 'index',
    width: 50,
    align: 'center' as const,
  },
  {
    title: '公司名称',
    dataIndex: 'name',
    ellipsis: true,
  },
  {
    title: '操作',
    dataIndex: 'action',
    width: 120,
    align: 'center' as const,
  },
];
</script>

<template>
  <Modal :width="1200" class="flex h-full flex-col">
    <!-- 搜索结果区域 - 上下布局 -->
    <div class="flex flex-1 flex-col overflow-hidden">
      <!-- 上方：公司列表 -->
      <div class="h-1/2 overflow-auto border-b">
        <Spin :spinning="searching">
          <Table
            :columns="columns"
            :data-source="
              searchResults.map((item, index) => ({
                ...item,
                index: index + 1,
              }))
            "
            :pagination="false"
            :row-key="(record: any) => record.entId"
            size="small"
            @change="(pagination: any) => {}"
          >
            <template #bodyCell="{ column, record }">
              <template v-if="column.dataIndex === 'action'">
                <Button
                  type="link"
                  size="small"
                  @click="handleSelectCompany(record)"
                >
                  查看详情
                </Button>
              </template>
            </template>
          </Table>

          <div
            v-if="!searching && searchResults.length === 0"
            class="py-8 text-center text-gray-400"
          >
            <p>暂无搜索结果</p>
          </div>
        </Spin>
      </div>

      <!-- 下方：公司详情 -->
      <div class="h-1/2 overflow-auto p-4">
        <Spin :spinning="detailLoading">
          <div v-if="selectedCompanyDetail" class="space-y-4">
            <!-- 基本信息 -->
            <div class="rounded-lg border p-4">
              <h3 class="mb-3 text-lg font-semibold">工商注册信息</h3>
              <div class="grid grid-cols-2 gap-3 text-sm">
                <div>
                  <span class="text-gray-600">企业名称：</span>
                  <span>{{ selectedCompanyDetail.entName || '-' }}</span>
                </div>
                <div>
                  <span class="text-gray-600">统一社会信用代码：</span>
                  <span>{{ selectedCompanyDetail.uniscid || '-' }}</span>
                </div>
                <div>
                  <span class="text-gray-600">法定代表人：</span>
                  <span>{{ selectedCompanyDetail.personName || '-' }}</span>
                </div>
                <div>
                  <span class="text-gray-600">注册资本：</span>
                  <span>{{ selectedCompanyDetail.regConcat || '-' }}</span>
                </div>
                <div>
                  <span class="text-gray-600">成立日期：</span>
                  <span>{{
                    parseDate(selectedCompanyDetail.esDate) || '-'
                  }}</span>
                </div>
                <div>
                  <span class="text-gray-600">营业期限：</span>
                  <span>{{
                    formatBusinessTerm(
                      selectedCompanyDetail.opFrom,
                      selectedCompanyDetail.opTo,
                    ) || '-'
                  }}</span>
                </div>
                <div class="col-span-2">
                  <span class="text-gray-600">注册地址：</span>
                  <span>{{
                    selectedCompanyDetail.dom ||
                    selectedCompanyDetail.regAddr ||
                    '-'
                  }}</span>
                </div>
                <div>
                  <span class="text-gray-600">电话：</span>
                  <span>{{ selectedCompanyDetail.tel || '-' }}</span>
                </div>
                <div>
                  <span class="text-gray-600">邮箱：</span>
                  <span>{{ selectedCompanyDetail.email || '-' }}</span>
                </div>
                <div class="col-span-2">
                  <span class="text-gray-600">官网：</span>
                  <span>{{ selectedCompanyDetail.website || '-' }}</span>
                </div>
              </div>
            </div>

            <!-- 操作按钮 -->
            <div class="flex justify-end">
              <Button type="primary" @click="handleImport"> 确定导入 </Button>
            </div>
          </div>

          <div
            v-else
            class="flex h-full items-center justify-center text-gray-400"
          >
            <p>请选择上方公司查看详细信息</p>
          </div>
        </Spin>
      </div>
    </div>
  </Modal>
</template>

<style scoped lang="scss">
:deep(.ant-table) {
  font-size: 12px;
}

:deep(.ant-table-thead > tr > th) {
  font-weight: 600;
  background-color: #fafafa;
}
</style>
