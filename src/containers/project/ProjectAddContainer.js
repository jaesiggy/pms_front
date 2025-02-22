import React, { useState, useEffect } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { Dayjs } from 'dayjs';
import ProjectAddForm from '../../components/project/ProjectAddForm';
import { tbl_insert } from '../../modules/common/tbl_crud';
import * as api from '../../lib/api/api';
import apiQueryAll from '../../lib/api/apiQueryAll';
import { qs_customer_all, qs_tasksBySid } from '../../lib/api/query';
import { message } from 'antd';
import moment from 'moment';
import { changeDrawer } from '../../modules/common';

const ProjectAddContainer = ({ mode }) => {
  const dispatch = useDispatch();
  const { auth } = useSelector(({ auth }) => ({
    auth: auth.auth,
  }));
  const { drawer } = useSelector(({ common }) => ({
    drawer: common.drawer,
  }));
  // 중복submit 방지 기능
  const [btnDisabled, setBtnDisabled] = useState(false);
  const [loading, setLoading] = useState(true);
  const [codebook, setCodebook] = useState();
  const [customers, setCustomers] = useState();
  const [tasks, setTasks] = useState();
  const [cusTasksId, setCusTaskId] = useState();
  const [teams, setTeams] = useState();

  const visible = drawer === 'pjtadd' ? true : false;
  console.log('>>>>>>>>>>>>>>>>visible>>>>>>>>>>>>>>', visible);

  const apiPjtCodebook = async () => {
    setLoading(true);
    try {
      // 전체 고객사 정보 가져오기
      const res_customer = await apiQueryAll('api/customers', qs_customer_all);

      // 프로젝트 코드북 가져오기
      const res_code = await api.pjtCodebook();
      // console.log('res_code>>>>', res_code);

      // custom code_task ID 정보만 가져오기 , custom:6
      // 서비스에 해당하는 task 추가시 가져온 ID 에 1:1 매칭
      const res_cus_tasks = await api.getQueryString(
        'api/code-tasks',
        qs_tasksBySid(6),
      );
      const filter_cus_task = res_cus_tasks.data.data.map((cus) => cus.id);

      // team 정보 가져오기
      const res_teams = await api.getQueryString(
        'api/scode-teams',
        'populate=%2A',
      );
      const sort_teams = res_teams.data.data.sort((a, b) => {
        return a.attributes.sort - b.attributes.sort;
      });
      //   console.log('>>>>', sort_teams);

      // 고객사 한글 이름 기준 정렬
      const sort_customer = res_customer.sort((a, b) => {
        return a.attributes.name < b.attributes.name
          ? -1
          : a.attributes.name > b.attributes.name
          ? 1
          : 0;
      });
      // 로딩 완료
      setCustomers(sort_customer);
      setCodebook(res_code);
      setTeams(sort_teams);
      setCusTaskId(filter_cus_task);
      setLoading(false);
    } catch (error) {
      console.error('>>error>>', error);
    }
  };

  useEffect(() => {
    apiPjtCodebook();
  }, []);

  const handleOnClose = () => {
    dispatch(changeDrawer(null));
    // setMode('view');
    setBtnDisabled(false);
  };

  const handleOnChange = async (e) => {
    //
    // console.log('******', e);
    try {
      const query = qs_tasksBySid(e);
      const request = await api.getQueryString('api/code-tasks', query);
      const sort_req = request.data.data.sort((a, b) => {
        return a.attributes.sort - b.attributes.sort;
      });
      setTasks(sort_req);
    } catch (error) {
      console.error(error);
    }
  };

  const onSubmit = async (values) => {
    try {
      console.log('>>>>>>onSubmit>>>>>>>', values);
      let count = 0;
      setBtnDisabled(true);

      // project_task 형식 [{23:[2,3,'2022-07-17', 'cus']},{24:[1,5,'2022-07-21]}]
      let project_tasks = {};
      // 220725-프로젝트  테이블 plan start date update 기능 삭제..tasks 에서 plan start 정보 가져오기
      // let plan_startdate = '';
      const plan_enddate = moment(values.plan_enddate).format('YYYY-MM-DD');
      for (let k in values) {
        if (k.indexOf('_k_') === 0) {
          console.log('>>key>>>', k);
          const newkey = k.replace('_k_', '').split('__');
          // console.log('>>newkey>>>', newkey);
          if (newkey[1] === 'start') {
            //날짜 type 변경 및 custom task 추가
            const date = moment(values[k]).format('YYYY-MM-DD');
            // if (plan_startdate === '') plan_startdate = date;
            // if (plan_startdate !== '') {
            //   plan_startdate = moment(plan_startdate).isAfter(date)
            //     ? date
            //     : plan_startdate;
            // }

            project_tasks = {
              ...project_tasks,
              [newkey[0]]: {
                ...project_tasks[newkey[0]],
                [newkey[1]]: date,
                custask: newkey[2],
              },
            };
          } else {
            project_tasks = {
              ...project_tasks,
              [newkey[0]]: {
                ...project_tasks[newkey[0]],
                [newkey[1]]: values[k],
              },
            };
          }
        }
      }
      console.log('>>key>>>', project_tasks);
      // console.log('>>plan start date>>>', plan_startdate);

      // 프로젝트 등록
      const project_data = {
        code_service: values.code_service,
        code_status: values.code_status,
        contracted: values.contracted,
        customer: values.customer,
        description: values.description,
        name: values.name,
        // plan_startdate,
        plan_enddate,
        price: values.price,
        scode_team: values.scode_team,
      };
      const pjt_insert = await tbl_insert('api/projects', project_data);
      console.log('>>>>> project data', project_data);
      console.log('>>>>> 1. project_insert 성공', pjt_insert);
      message.success('프로젝트 등록 성공', 3);
      //프로젝트 task 등록
      // project task 값 추출 - 키에서 '__' 포함 키 배열로 변경
      const projectId = pjt_insert.data.data.id;

      for (let key in project_tasks) {
        console.log('>>>>>>task key>>>>>>>', key);
        const task = project_tasks[key];
        console.log('>>>>>>task value>>>>>>>', task);

        //   newTasks.push([taskid, v]);
        const task_data = {
          project: projectId,
          code_task: parseInt(key),
          manpower: Math.round(task.mp * 10) / 10,
          plan_day: Math.round(task.planday),
          cus_task: task.custask,
          plan_startdate: task.start,
        };
        const task_insert = await tbl_insert('api/project-tasks', task_data);
        console.log('>>>>>>task_data>>>>>>>', task_data);
        count++;
      }
      // project_change 등등..프로젝트 등록정보, 프로젝트 상태 정보
      // const _code_state =
      //   codebook[1].data.data[values.code_status].attributes.name;
      const _code_state = codebook[1].data.data.filter(
        (f) => f.id === values.code_status,
      )[0].attributes.name;
      const project_change1 = {
        project: projectId,
        type: 'init',
        change: '프로젝트 생성',
        users_permissions_user: auth.user.id,
      };
      const project_change2 = {
        project: projectId,
        type: 'code_status',
        change: `init -> ${_code_state}`,
        users_permissions_user: auth.user.id,
      };
      const insert1 = await tbl_insert('api/project-changes', project_change1);
      const insert2 = await tbl_insert('api/project-changes', project_change2);

      // 완료메시지
      message.success(`프로젝트 task ${count}건 등록`, 3);
    } catch (error) {
      message.error(`등록 실패 - 관리자에게 문의 바랍니다.`, 3);
      console.error(error);
    }
    setBtnDisabled(false);
    dispatch(changeDrawer(null));
    // setMode('view');
  };

  const onSubmit1 = async (values) => {
    try {
      console.log('>>>>>>onSubmit>>>>>>>', values);
      console.log('>>>>>>codebook>>>>>>>', codebook);
      let count = 0;
      setBtnDisabled(true);
      // 프로젝트 등록
      const pjt_insert = await tbl_insert('api/projects', values);
      // console.log('>>>>> 1. project_insert 성공', insert);
      message.success('프로젝트 등록 성공', 3);
      //프로젝트 task 등록
      // project task 값 추출 - 키에서 '__' 포함 키 배열로 변경
      const projectId = pjt_insert.data.data.id;
      for (let k in values) {
        // project task
        if (k.indexOf('__') === 0) {
          const v = values[k];
          const taskid = k.replace('__', '');
          const plan_day = v;
          let code_task;
          let cus_task;
          if (taskid.indexOf('_c_') >= 0) {
            const split_task = taskid.split('_c_');
            code_task = split_task[0];
            cus_task = split_task[1];
          } else {
            code_task = taskid;
          }

          //   newTasks.push([taskid, v]);
          const task_data = {
            project: projectId,
            code_task: parseInt(code_task),
            plan_day: plan_day,
            cus_task: cus_task,
          };
          const task_insert = await tbl_insert('api/project-tasks', task_data);
          count++;
          // console.log(
          //   `>>>> 2. task-${task_insert.data.data.id} : `,
          //   task_insert.data,
          // );
        }
      }

      // project_change 등등..프로젝트 등록정보, 프로젝트 상태 정보
      // const _code_state =
      //   codebook[1].data.data[values.code_status].attributes.name;
      const _code_state = codebook[1].data.data.filter(
        (f) => f.id === values.code_status,
      )[0].attributes.name;
      const project_change1 = {
        project: projectId,
        type: 'init',
        change: '프로젝트 생성',
        users_permissions_user: auth.user.id,
      };
      const project_change2 = {
        project: projectId,
        type: 'code_status',
        change: `init -> ${_code_state}`,
        users_permissions_user: auth.user.id,
      };
      const insert1 = await tbl_insert('api/project-changes', project_change1);
      const insert2 = await tbl_insert('api/project-changes', project_change2);

      // 완료메시지
      message.success(`프로젝트 task ${count}건 등록`, 3);
    } catch (error) {
      console.error(error);
    }

    //
    setBtnDisabled(false);
    dispatch(changeDrawer(null));
    // setMode('view');
  };

  //   console.log('*******', teams);

  return (
    <>
      <ProjectAddForm
        visible={visible}
        loading={loading}
        btnDisabled={btnDisabled}
        customers={customers}
        codebook={codebook}
        tasks={tasks}
        teams={teams}
        cusTasksId={cusTasksId}
        handleOnClose={handleOnClose}
        handleOnChange={handleOnChange}
        onSubmit={onSubmit}
      />
    </>
  );
};

export default ProjectAddContainer;
