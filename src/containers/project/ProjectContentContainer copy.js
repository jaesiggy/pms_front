import React, { useState, useEffect } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import {
  getProjectList,
  getProject,
  updateBacklog,
} from '../../modules/project';
import moment from 'moment';
// import { getProjectList } from '../../modules/projectList';
import ProjectListTable from '../../components/project/ProjectListTable';
import ProjectEditForm from '../../components/project/ProjectEditForm';
import { apiCustomerList } from '../../lib/api/api';
import * as api from '../../lib/api/api';
import { startLoading, finishLoading } from '../../modules/loading';
import calWorkTime from '../../modules/project/calWorkTime';
import { weekOfMonth } from '../../modules/common/weekOfMonth';
import { qs_workListAll } from '../../lib/api/query';
import { qs_projectList } from '../../lib/api/queryProject';
import ProjectSubContainer from './ProjectSubContainer';
import { message } from 'antd';
import { tbl_update, tbl_insert } from '../../modules/common/tbl_crud';
import { isTypeSystemDefinitionNode } from 'graphql';
import ProjectDrFormIssue from '../../components/project/ProjectDrFormIssue';

const ProjectContentContainer = () => {
  const dispatch = useDispatch();
  const { auth } = useSelector(({ auth }) => ({
    auth: auth.auth,
  }));
  const { project_status } = useSelector(({ project }) => ({
    project_status: project.status,
  }));
  // const [projectList, setProjectList] = useState();
  const { lists, error, loading } = useSelector(({ project, loading }) => ({
    // lists: project.list,
    lists: project.data ? project.data[project_status.id] : null,
    error: project.error,
    loading: loading['project/GET_PROJECTLIST'],
  }));
  const [btnDisabled, setBtnDisabled] = useState(false);
  const [visible, setVisible] = useState(false);
  const [record, setRecord] = useState();
  const [codestatus, setCodestatus] = useState();
  const [checkbox, setCheckbox] = useState({});
  const [visibleIssue, setVisibleIssue] = useState(false);
  const [editFormMode, setEditFormMode] = useState('pjt');
  //
  // console.log('loading', loading);
  // console.log('list', lists);
  const { wlist } = useSelector(({ project }) => ({
    wlist: project.wlist,
  }));
  const [totalWorkTime, setTotalWorktime] = useState([]);

  // 컴포넌트가 처음 렌더링 될 때 프로젝트 전체 리스트 정보 가져옴
  // 페이지 이동 후 재 접속시.. 프로젝트 리스트 다시 가져옴...코드 수정 필요..
  // useEffect(() => {
  //   // const params = 'projects?code_status.id=2';
  //   // 1-시작전, 2-진행중, 3-보류, 4-완료, 5-대기, 6-검수
  //   const code_status_id = 2;
  //   const query = qs_projectList(code_status_id);
  //   ////
  //   // dispatch(getProject(query));
  //   dispatch(getProjectList(query, code_status_id));
  //   calTotalWorkTime();
  // }, []);

  const calTotalWorkTime = async () => {
    const result = [];
    const statusId = 2;
    let start = 0;
    const limit = 50;
    const query = qs_workListAll(statusId, start, limit);
    const request = await api.getQueryString('api/works', query);
    result.push(...request.data.data);
    // console.log('-----request-----', request.data);
    const total = request.data.meta.pagination.total;
    for (start = start + limit; start <= total; start += limit) {
      const query = qs_workListAll(statusId, start, limit);
      const request = await api.getQueryString('api/works', query);
      result.push(...request.data.data);
      // console.log('-----request-----', start, '--', request.data);
    }
    // console.log('-----result------', result);
    const worktime = calWorkTime(result);
    // console.log('--calworktime--', worktime);
    setTotalWorktime(worktime);
  };

  // 작업통계 기능 projectSubContainer 통합필요..
  const [worktime, setWorktime] = useState([]);
  useEffect(() => {
    if (!wlist) return;
    const result = calWorkTime(wlist);
    console.log('--calworktime--', result);
    setWorktime(result);
  }, [wlist]);

  const [tableData, setTableData] = useState([]);
  useEffect(() => {
    const baseprice = 500000; //기준금액
    let backlog = 0;
    if (lists) {
      const tableList = lists.map((list, index) => {
        // const _progress = list.project_progress;
        // if (project_status.progress === 10 && _progress >= 0.2) return;
        const elapsed = moment().diff(moment(list.startdate), 'days');
        const elapsed_last = moment().diff(
          moment(list.attributes.last_workupdate),
          'days',
        );
        // const _totalworktime = totalWorkTime.filter((v) => v.id === list.id)[0];
        // console.log('**worktime**', index, _totalworktime);
        const remaining_day =
          Math.round((list.total_plan - list.total_work) * 10) / 10;
        backlog += remaining_day > 0 ? remaining_day : 0;
        const _base_day =
          list.attributes.price !== 0
            ? (list.attributes.price / baseprice).toFixed(0)
            : 0;
        const _over_day =
          _base_day === 0
            ? '-'
            : _base_day - list.total_plan >= 0
            ? '-'
            : (list.total_plan - _base_day).toFixed(0);
        // issue 기능 추가 22.9.25
        const issue_cnt = list.attributes.pjt_issues.data.length;
        const issue = issue_cnt !== 0 ? list.attributes.pjt_issues.data : '';

        //
        const array = {
          key: list.id,
          id: list.id,
          contracted:
            list.attributes.contracted === null ||
            list.attributes.contracted === false
              ? 'No'
              : 'Yes',
          customer: list.attributes.customer.data.attributes.name,
          name: list.attributes.name,
          service: list.attributes.code_service.data.attributes.name,
          team:
            list.attributes.scode_team.data === null
              ? ''
              : list.attributes.scode_team.data.attributes.name,
          code_status: list.attributes.code_status.data.attributes.name,
          plan_startdate: moment(list.attributes.plan_startdate).format(
            'YY-MM-DD',
          ),
          plan_enddate: moment(list.attributes.plan_enddate).format('YY-MM-DD'),
          startdate: `${moment(list.startdate).format('YY-MM-DD')}`,
          // startdate: list.startdate,
          enddate: list.attributes.enddate,
          price: list.attributes.price.toLocaleString('ko-KR'),
          lastUpdate: moment(list.attributes.last_workupdate).format(
            'YY-MM-DD',
          ),
          project_progress: list.project_progress,
          progressRate: list.progressRate,
          elapsed: elapsed,
          elapsed_last: elapsed_last,
          // total_plan: list.total_plan.toFixed(0),
          total_plan: list.total_plan ? list.total_plan.toFixed(0) : '-',
          total_work: list.total_work,
          base_day: _base_day === 0 ? '-' : _base_day,
          over_day: _over_day,
          remaining_day: remaining_day > 0 ? remaining_day : 0,
          // totalday:
          //   _totalworktime !== undefined
          //     ? Math.round(_totalworktime.worktime / 8)
          //     : '',
          // action: 'View',
          issue_cnt: issue_cnt === 0 ? '' : issue_cnt,
          issue: issue,
        };
        return array;
      });
      // 수주잔량
      if (project_status.id === 2) {
        dispatch(updateBacklog(Math.round(backlog)));
      }
      if (!project_status.progress) {
        setTableData(tableList);
      } else if (project_status.id === 2 && project_status.progress) {
        const filterlist = tableList.filter((v) => {
          // console.log('**progressRate**', v);
          // console.log('**project_status.progress**', project_status.progress);
          return v.progressRate === project_status.progress;
        });
        // console.log('>>>>>>>>>>>>>>>>filterlist', filterlist);
        setTableData(filterlist);
      }
    }
  }, [lists, project_status]);

  // console.log('tableList', tableData);

  const handleEdit = async (record) => {
    //
    console.log('****record****', record);
    try {
      const request = await api.getQueryString(
        'api/code-statuses',
        'populate=%2A',
      );
      console.log('****code-statuses****', request.data.data);
      setCodestatus(request.data.data);
      setRecord(record);
      setVisible(true);
    } catch (error) {
      console.error(error);
    }
  };

  // 이슈 보기 & 수정 2022.09.26
  const handleIssue = async (record) => {
    console.log('*** handle Issue ***', record);
    setVisibleIssue(true);
  };

  const onClose = (status) => {
    //
    console.log('----onClose----');
    if (status) {
      setRecord();
      setCheckbox({});
      setVisible(false);
    } else {
      alert('프로젝트 update 중...');
    }
  };

  const onSubmit1 = (value1) => {
    console.log('>>>>value>>', value1);
    console.log('>>>>issue mode>>', editFormMode);
  };

  const onSubmit = async (value) => {
    // console.log('>>>>>>', value);
    if (editFormMode === 'pjt') {
      try {
        setBtnDisabled(true);
        const update_data = {};
        for (let k in checkbox) {
          const v = checkbox[k];
          if (v === true && typeof value[k] === 'object') {
            update_data[k] = moment(value[k]).format('YYYY-MM-DD').toString();
          } else if (v === true && typeof value[k] !== 'object') {
            update_data[k] = value[k];
          }
        }
        console.log('1.>>>>>>>', update_data);
        if (typeof update_data.code_status === 'string') {
          return message.error(`입력 오류 - 서비스 상태`, 3);
        }
        const request = await tbl_update('api/projects', value.id, update_data);
        // console.log('-----------', request);
        message.success(`update - ${request.statusText}`, 3);
        const status_filter = (key) => {
          const test = codestatus.filter((f) => f.id === key);
          return test[0].attributes.name;
        };
        // prject_change table insert
        console.log('record-----------', record);
        let count = 0;
        for (let k in update_data) {
          let changevalue;
          if (k === 'code_status') {
            changevalue = `${record[k]} -> ${status_filter(update_data[k])}`;
          } else {
            const newvalue =
              update_data[k] !== undefined ? update_data[k].toString() : '';
            changevalue = `${record[k]} -> ${newvalue}`;
          }

          const insert_data = {
            project: value.id,
            type: k,
            change: changevalue,
            users_permissions_user: auth.user.id,
          };
          // console.log('-----------', insert_data);
          const insert = await tbl_insert('api/project-changes', insert_data);
          count++;
          // console.log('-----insert------', insert);
        }
        message.success(`${count}건 처리 완료`, 3);
      } catch (error) {
        console.error(error);
        message.error(`관리자에게 문의 바랍니다.`, 3);
      } finally {
        setCheckbox({});
        setVisible(false);
        setBtnDisabled(false);
      }
    } else if (editFormMode === 'issue') {
      console.log('>>>>pjt id>>', record.id);
      //
      setBtnDisabled(true);
      const insert_data = {
        ...value,
        project: record.id,
        name: value.issue_name,
        issue_date: moment(value.issue_date).format('YYYY-MM-DD').toString(),
      };
      console.log('>>>>insert data>>', insert_data);
      const request = await tbl_insert('api/pjt-issues', insert_data);
      message.success(`add issue - ${request.statusText}`, 3);
      console.log('-----------', request);

      // change log 추가
      const issue_changelog_data = {
        project: record.id,
        type: 'issue',
        change: `issue 추가`,
        users_permissions_user: auth.user.id,
      };
      const insert = await tbl_insert(
        'api/project-changes',
        issue_changelog_data,
      );
      message.success(`change log - ${insert.statusText}`, 3);

      //
      setVisible(false);
      setBtnDisabled(false);
    }
    //
  };

  // 수정 form 에서 체크 박스 변경시
  const handleCheck = (e) => {
    const name = e.target['data-id'];
    setCheckbox({ ...checkbox, [name]: e.target.checked });
  };

  const handleSearch1 = (id) => [
    //
    console.log('id', id),
  ];

  const handleEditFormMode = (v) => {
    // edit form 언마운트시 'pjt' 리턴
    setEditFormMode(v);
  };

  return (
    <>
      <ProjectListTable
        tableData={tableData}
        loading={loading}
        handleEdit={handleEdit}
        handleSearch1={handleSearch1}
        handleIssue={handleIssue}
      />
      {visible ? (
        <ProjectEditForm
          visible={visible}
          btnDisabled={btnDisabled}
          record={record}
          code_status={codestatus}
          onClose={onClose}
          onSubmit={onSubmit}
          handleCheck={handleCheck}
          checkbox={checkbox}
          editFormMode={editFormMode}
          handleEditFormMode={handleEditFormMode}
        />
      ) : (
        ''
      )}
      {visibleIssue ? <ProjectDrFormIssue visible={visibleIssue} /> : ''}
    </>
  );
};

export default ProjectContentContainer;
