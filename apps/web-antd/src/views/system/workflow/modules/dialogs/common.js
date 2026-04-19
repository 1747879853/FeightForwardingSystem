import $func from '../../utils/func';
import { ref } from 'vue';

export const searchVal = ref('');
export const departments = ref({
  titleDepartments: [],
  childDepartments: [],
  employees: [],
});
export const roles = ref([]);

export const getRoleList = async () => {
  // TODO: Wire to real API - e.g.: const { data } = await getRolesApi();
  // roles.value = data.list || data;
  roles.value = [];
};

export const getDepartmentList = async (parentId = 0) => {
  // TODO: Wire to real API - e.g.: const { data } = await getDepartmentsApi({ parentId });
  // departments.value = data;
  departments.value = {
    titleDepartments: [],
    childDepartments: [],
    employees: [],
  };
};

export const getDebounceData = (event, type = 1) => {
  $func.debounce(async () => {
    if (event.target.value) {
      if (type == 1) {
        departments.value.childDepartments = [];
        // TODO: Wire to real API - e.g.: const res = await getEmployeesApi({ searchName: event.target.value, pageNum: 1, pageSize: 30 });
        // departments.value.employees = res.data.list;
      } else {
        // TODO: Wire to real API - e.g.: const res = await getRolesApi({ searchName: event.target.value, pageNum: 1, pageSize: 30 });
        // roles.value = res.data.list;
      }
    } else {
      type == 1 ? await getDepartmentList() : await getRoleList();
    }
  })();
};
