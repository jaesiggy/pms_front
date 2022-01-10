import React, { useState, useEffect } from 'react';
import { Form, Select, Radio } from 'antd';

const WorkFilterForm = ({ userList, user_info_id, userOnChange }) => {
  const [form] = Form.useForm();
  const [value, setValue] = useState('Worker');
  const optionsWithDisabled = [
    { label: '고객사', value: 'Customer' },
    { label: '프로젝트', value: 'Project' },
    { label: '작업자', value: 'Worker' },
  ];
  const onChange = (e) => {
    console.log('radio4 checked', e.target.value);
    setValue(e.target.value);
  };

  // Form 에서 로그인 사용자 선택
  useEffect(() => {
    form.setFieldsValue({
      user: user_info_id,
    });
  }, []);

  return (
    <>
      <div>
        <Radio.Group
          options={optionsWithDisabled}
          onChange={onChange}
          value={value}
          optionType="button"
          buttonStyle="solid"
        />
      </div>
      <div>
        <Form form={form}>
          <Form.Item label="작업자" name="user">
            <Select onChange={userOnChange}>
              {userList.map((list) => {
                return (
                  <Select.Option key={list.id} value={list.id}>
                    {list.name}
                  </Select.Option>
                );
              })}
            </Select>
          </Form.Item>
        </Form>
      </div>
    </>
  );
};

export default WorkFilterForm;
