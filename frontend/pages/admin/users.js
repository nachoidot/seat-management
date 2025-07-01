import { useState, useEffect } from 'react';
import { useRouter } from 'next/router';
import Layout from '../../components/Layout';
import AdminNav from '../../components/AdminNav';
import { getUsers, createUser, deleteUser, updateUser, bulkCreateUsers, bulkDeleteUsers, resetUserPassword } from '../../utils/api';
import { useAdmin } from '../../utils/auth';
import { toast } from 'react-toastify';
import { FaPlus, FaTrash, FaEdit, FaUserShield, FaUser, FaUpload, FaDownload, FaTrashAlt, FaCheckSquare, FaSquare, FaKey } from 'react-icons/fa';
import { ClientOnly } from '../../utils/client-only';

export default function AdminUsers() {
  const [users, setUsers] = useState([]);
  const [selectedUsers, setSelectedUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showAddModal, setShowAddModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [showBulkDeleteModal, setShowBulkDeleteModal] = useState(false);
  const [showBulkModal, setShowBulkModal] = useState(false);
  const [showResetPasswordModal, setShowResetPasswordModal] = useState(false);
  const [selectedUser, setSelectedUser] = useState(null);
  const [dragActive, setDragActive] = useState(false);
  const [csvData, setCsvData] = useState([]);
  const [csvErrors, setCsvErrors] = useState([]);
  const [selectedCsvUsers, setSelectedCsvUsers] = useState([]); // 선택된 CSV 사용자들
  const [duplicateUsers, setDuplicateUsers] = useState([]); // 중복 사용자 목록
  const [showDuplicateModal, setShowDuplicateModal] = useState(false); // 중복 확인 모달
  const [duplicateAction, setDuplicateAction] = useState('skip'); // 중복 처리 방식: skip, update, error
  const [newUserData, setNewUserData] = useState({
    studentId: '',
    name: '',
    birthdate: '',
    priority: 3,
    isAdmin: false
  });
  const [isSubmitting, setIsSubmitting] = useState(false);
  
  const router = useRouter();

  // Use admin hook to protect this page
  const isAdmin = useAdmin();

  useEffect(() => {
    if (isAdmin) {
      loadUsers();
    }
  }, [isAdmin]);

  const loadUsers = async () => {
    try {
      setLoading(true);
      const response = await getUsers();
      setUsers(response.data || []); // 올바른 응답 구조로 수정
      setSelectedUsers([]); // 사용자 목록이 새로고침되면 선택 초기화
    } catch (error) {
      console.error('사용자 로드 오류:', error);
      toast.error('사용자 정보를 불러오는 중 오류가 발생했습니다.');
    } finally {
      setLoading(false);
    }
  };

  // 체크박스 관련 함수들
  const handleSelectUser = (studentId) => {
    setSelectedUsers(prev => 
      prev.includes(studentId) 
        ? prev.filter(id => id !== studentId)
        : [...prev, studentId]
    );
  };

  const handleSelectAll = () => {
    const nonAdminUsers = users.filter(user => !user.isAdmin);
    if (selectedUsers.length === nonAdminUsers.length) {
      setSelectedUsers([]);
    } else {
      setSelectedUsers(nonAdminUsers.map(user => user.studentId));
    }
  };

  // 일괄 삭제 관련 함수들
  const handleBulkDelete = async (type, options = {}) => {
    try {
      setIsSubmitting(true);
      
      const response = await bulkDeleteUsers(options);
      
      toast.success(response.message || '사용자가 삭제되었습니다.');
      setSelectedUsers([]);
      setShowBulkDeleteModal(false);
      await loadUsers();
    } catch (error) {
      console.error('일괄 삭제 오류:', error);
      console.error('오류 응답:', error.response?.data);
      
      const errorMessage = error.response?.data?.message || error.message || '일괄 삭제 중 오류가 발생했습니다.';
      toast.error(errorMessage);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleInputChange = (e) => {
    const { name, value, type, checked } = e.target;
    setNewUserData({
      ...newUserData,
      [name]: type === 'checkbox' ? checked : value
    });
  };

  const handleAddUser = async (e) => {
    e.preventDefault();
    
    if (!newUserData.studentId || !newUserData.name) {
      toast.error('학번/수험번호와 이름을 모두 입력해주세요.');
      return;
    }
    
    try {
      setIsSubmitting(true);
      await createUser(newUserData);
      
      toast.success('사용자가 추가되었습니다.');
      setShowAddModal(false);
      setNewUserData({
        studentId: '',
        name: '',
        birthdate: '',
        priority: 3,
        isAdmin: false
      });
      await loadUsers();
    } catch (error) {
      console.error('사용자 추가 오류:', error);
      toast.error(error.response?.data?.message || '사용자 추가 중 오류가 발생했습니다.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleEditUser = (user) => {
    setSelectedUser(user);
    setNewUserData({
      studentId: user.studentId,
      name: user.name,
      birthdate: user.birthdate,
      priority: user.priority,
      isAdmin: user.isAdmin
    });
    setShowEditModal(true);
  };

  const handleUpdateUser = async (e) => {
    e.preventDefault();
    
    if (!newUserData.name) {
      toast.error('이름을 입력해주세요.');
      return;
    }

    // 생년월일 형식 확인 (선택사항이지만 입력한 경우 형식 검증)
    if (newUserData.birthdate && !/^\d{8}$/.test(newUserData.birthdate)) {
      toast.error('생년월일은 YYYYMMDD 형식의 8자리 숫자로 입력해주세요.');
      return;
    }
    
    try {
      setIsSubmitting(true);
      await updateUser(selectedUser._id, newUserData);
      
      toast.success('사용자 정보가 업데이트되었습니다.');
      setShowEditModal(false);
      await loadUsers();
    } catch (error) {
      console.error('사용자 업데이트 오류:', error);
      toast.error(error.response?.data?.message || '사용자 업데이트 중 오류가 발생했습니다.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDeleteClick = (user) => {
    setSelectedUser(user);
    setShowDeleteModal(true);
  };

  const handleDeleteUser = async () => {
    try {
      setIsSubmitting(true);
      await deleteUser(selectedUser._id);
      
      toast.success('사용자가 삭제되었습니다.');
      setShowDeleteModal(false);
      await loadUsers();
    } catch (error) {
      console.error('사용자 삭제 오류:', error);
      toast.error(error.response?.data?.message || '사용자 삭제 중 오류가 발생했습니다.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleResetPasswordClick = (user) => {
    setSelectedUser(user);
    setShowResetPasswordModal(true);
  };

  const handleResetPassword = async () => {
    try {
      setIsSubmitting(true);
      await resetUserPassword(selectedUser.studentId);
      
      toast.success(`${selectedUser.name} 사용자의 비밀번호가 초기값(sg1234)으로 재설정되었습니다.`);
      setShowResetPasswordModal(false);
    } catch (error) {
      console.error('비밀번호 초기화 오류:', error);
      toast.error(error.response?.data?.message || '비밀번호 초기화 중 오류가 발생했습니다.');
    } finally {
      setIsSubmitting(false);
    }
  };

  // CSV 파일 처리 함수
  const parseCSV = (text) => {
    const lines = text.split('\n').filter(line => line.trim());
    if (lines.length === 0) return [];

    const headers = lines[0].split(',').map(h => h.trim().replace(/"/g, ''));
    const data = [];

    // 헤더 매핑
    const headerMap = {
      '학번': 'studentId',
      '수험번호': 'studentId',
      'studentId': 'studentId',
      '이름': 'name',
      'name': 'name',
      '우선순위': 'priority',
      '유형': 'priority',
      'priority': 'priority',
      '관리자': 'isAdmin',
      'isAdmin': 'isAdmin'
    };

    for (let i = 1; i < lines.length; i++) {
      const values = lines[i].split(',').map(v => v.trim().replace(/"/g, ''));
      const row = {};
      
      headers.forEach((header, index) => {
        const mappedKey = headerMap[header];
        if (mappedKey && values[index]) {
          row[mappedKey] = values[index];
        }
      });

      if (row.studentId || row.name) {
        data.push(row);
      }
    }

    return data;
  };

  const handleDrag = (e) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === 'dragenter' || e.type === 'dragover') {
      setDragActive(true);
    } else if (e.type === 'dragleave') {
      setDragActive(false);
    }
  };

  const handleDrop = (e) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);

    const files = [...e.dataTransfer.files];
    handleFiles(files);
  };

  const handleFileInput = (e) => {
    const files = [...e.target.files];
    handleFiles(files);
  };

  const handleFiles = (files) => {
    const file = files[0];
    if (!file) return;

    if (!file.name.toLowerCase().endsWith('.csv')) {
      toast.error('CSV 파일만 업로드 가능합니다.');
      return;
    }

    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const text = e.target.result;
        const data = parseCSV(text);
        
        if (data.length === 0) {
          toast.error('유효한 데이터가 없습니다.');
          return;
        }

        setCsvData(data);
        setCsvErrors([]);
        // 모든 사용자를 기본적으로 선택된 상태로 설정
        setSelectedCsvUsers(data.map((_, index) => index));
        setDuplicateUsers([]);
        setShowBulkModal(true);
      } catch (error) {
        console.error('CSV 파싱 오류:', error);
        toast.error('CSV 파일을 읽는 중 오류가 발생했습니다.');
      }
    };
    reader.readAsText(file);
  };



  // CSV 사용자 선택 관련 함수들
  const handleSelectCsvUser = (index) => {
    setSelectedCsvUsers(prev => 
      prev.includes(index) 
        ? prev.filter(i => i !== index)
        : [...prev, index]
    );
  };

  const handleSelectAllCsvUsers = () => {
    if (selectedCsvUsers.length === csvData.length) {
      setSelectedCsvUsers([]);
    } else {
      setSelectedCsvUsers(csvData.map((_, index) => index));
    }
  };

  // 중복 사용자 검사 함수
  const checkDuplicateUsers = (usersToCheck) => {
    const duplicates = [];
    const existingStudentIds = users.map(user => user.studentId);
    
    usersToCheck.forEach((user, index) => {
      if (existingStudentIds.includes(user.studentId)) {
        duplicates.push({
          ...user,
          rowIndex: index + 1, // CSV에서 1부터 시작하는 행 번호
          originalIndex: index
        });
      }
    });
    
    return duplicates;
  };

  // 중복 검사와 함께 업로드 처리
  const handleBulkSubmitWithDuplicateCheck = async () => {
    // 선택된 사용자들만 필터링
    const selectedUsers = selectedCsvUsers.length > 0 
      ? csvData.filter((_, index) => selectedCsvUsers.includes(index))
      : csvData;

    if (selectedUsers.length === 0) {
      toast.error('등록할 사용자를 선택해주세요.');
      return;
    }

    // 중복 검사
    const duplicates = checkDuplicateUsers(selectedUsers);
    
    if (duplicates.length > 0) {
      // 중복이 발견되면 중복 처리 모달 표시
      setDuplicateUsers(duplicates);
      setShowDuplicateModal(true);
      return;
    }

    // 중복이 없으면 바로 등록 (기본값: skip)
    await proceedWithRegistration('skip');
  };

  // 중복 처리 방식에 따라 등록 진행
  const proceedWithRegistration = async (action = duplicateAction) => {
    try {
      setIsSubmitting(true);
      
      // 선택된 사용자들 가져오기
      const selectedUsers = selectedCsvUsers.length > 0 
        ? csvData.filter((_, index) => selectedCsvUsers.includes(index))
        : csvData;

      if (selectedUsers.length === 0) {
        toast.error('등록할 사용자를 선택해주세요.');
        return;
      }

      const response = await bulkCreateUsers(selectedUsers, action);
      
      toast.success(response.message || '처리가 완료되었습니다.');
      setShowBulkModal(false);
      setShowDuplicateModal(false);
      setCsvData([]);
      setCsvErrors([]);
      setSelectedCsvUsers([]);
      setDuplicateUsers([]);
      setDuplicateAction('skip');
      await loadUsers();
    } catch (error) {
      console.error('일괄 업로드 오류:', error);
      if (error.response?.data?.errors) {
        setCsvErrors(error.response.data.errors);
      } else {
        const errorMessage = error.response?.data?.message || '일괄 업로드 중 오류가 발생했습니다.';
        toast.error(errorMessage);
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  const downloadTemplate = () => {
    const template = '학번,이름,우선순위,관리자\n2021001,홍길동,3,false\n2021002,김철수,1,false\n2023001,이영희,2,false\n2023002,박민수,1,true';
    
    // UTF-8 BOM 추가 (Excel에서 한글 인코딩 문제 해결)
    const BOM = '\uFEFF';
    const csvContent = BOM + template;
    
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    if (link.download !== undefined) {
      const url = URL.createObjectURL(blob);
      link.setAttribute('href', url);
      link.setAttribute('download', '사용자_템플릿.csv');
      link.style.visibility = 'hidden';
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    }
  };

  return (
    <Layout title="사용자 관리 - 연구실 자리 배정 시스템">
      <ClientOnly>
        <AdminNav />
      </ClientOnly>
      
      <div className="min-h-screen bg-gray-100 md:ml-64">
        <div className="container mx-auto px-4 py-8">
                      <div className="flex justify-between items-center mb-4">
            <h1 className="text-3xl font-bold text-primary">사용자 관리</h1>
            
            <div className="flex space-x-2">
              <button 
                onClick={downloadTemplate}
                className="bg-green-600 hover:bg-green-700 text-white font-bold py-2 px-4 rounded flex items-center"
              >
                <FaDownload className="mr-2" /> CSV 템플릿
              </button>
              
              <label className="bg-yellow-600 hover:bg-yellow-700 text-white font-bold py-2 px-4 rounded flex items-center cursor-pointer">
                <FaUpload className="mr-2" /> CSV 업로드
                <input
                  type="file"
                  accept=".csv"
                  onChange={handleFileInput}
                  className="hidden"
                />
              </label>
            
            <button 
              onClick={() => {
                setNewUserData({
                  studentId: '',
                  name: '',
                  birthdate: '',
                  priority: 3,
                  isAdmin: false
                });
                setShowAddModal(true);
              }}
              className="bg-primary hover:bg-blue-700 text-white font-bold py-2 px-4 rounded flex items-center"
            >
              <FaPlus className="mr-2" /> 사용자 추가
            </button>
          </div>
          </div>
          
          {/* 초기 비밀번호 안내 */}
          <div className="bg-blue-50 border-l-4 border-blue-400 p-4 mb-6">
            <div className="flex">
              <div className="flex-shrink-0">
                <svg className="h-5 w-5 text-blue-400" viewBox="0 0 20 20" fill="currentColor">
                  <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
                </svg>
              </div>
              <div className="ml-3">
                <h3 className="text-sm font-medium text-blue-800">초기 비밀번호 안내</h3>
                <div className="mt-2 text-sm text-blue-700">
                  <p>
                    새로 생성되는 모든 사용자의 초기 비밀번호는 <strong className="bg-blue-200 px-1 rounded">sg1234</strong>로 설정됩니다. 
                    사용자들에게 첫 로그인 후 비밀번호 변경을 안내하세요.
                  </p>
                </div>
              </div>
            </div>
          </div>
          
          {loading ? (
            <div className="text-center py-12">
              <p className="text-gray-600">데이터를 불러오는 중...</p>
            </div>
          ) : users.length === 0 ? (
            <div className="bg-white rounded-lg shadow-md p-8 text-center">
              <p className="text-gray-600 text-lg mb-4">등록된 사용자가 없습니다</p>
              
              {/* 드래그앤드롭 영역 */}
              <div 
                className={`border-2 border-dashed rounded-lg p-8 mb-4 transition-colors ${
                  dragActive ? 'border-blue-400 bg-blue-50' : 'border-gray-300'
                }`}
                onDragEnter={handleDrag}
                onDragLeave={handleDrag}
                onDragOver={handleDrag}
                onDrop={handleDrop}
              >
                <FaUpload className="mx-auto text-4xl text-gray-400 mb-4" />
                <p className="text-gray-600 mb-2">CSV 파일을 여기로 끌어다 놓거나</p>
                <label className="bg-blue-500 hover:bg-blue-600 text-white px-4 py-2 rounded cursor-pointer">
                  파일 선택
                  <input
                    type="file"
                    accept=".csv"
                    onChange={handleFileInput}
                    className="hidden"
                  />
                </label>
              </div>
              
              <div className="flex justify-center space-x-2">
                <button 
                  onClick={downloadTemplate}
                  className="bg-green-600 hover:bg-green-700 text-white font-bold py-2 px-4 rounded"
                >
                  <FaDownload className="mr-2" /> CSV 템플릿 다운로드
                </button>
              <button 
                onClick={() => setShowAddModal(true)}
                className="bg-primary hover:bg-blue-700 text-white font-bold py-2 px-4 rounded"
              >
                  개별 사용자 추가
              </button>
              </div>
            </div>
          ) : (
            <div className="space-y-4">
              {/* 일괄 작업 버튼들 */}
              {selectedUsers.length > 0 && (
                <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                  <div className="flex items-center justify-between">
                    <span className="text-blue-800 font-medium">
                      {selectedUsers.length}명이 선택되었습니다
                    </span>
                    <div className="flex space-x-2">
                      <button
                        onClick={() => setShowBulkDeleteModal(true)}
                        className="bg-red-600 hover:bg-red-700 text-white px-4 py-2 rounded flex items-center"
                      >
                        <FaTrashAlt className="mr-2" />
                        선택 삭제
                      </button>
                      <button
                        onClick={() => setSelectedUsers([])}
                        className="bg-gray-500 hover:bg-gray-600 text-white px-4 py-2 rounded"
                      >
                        선택 해제
                      </button>
                    </div>
                  </div>
                </div>
              )}

            <div className="bg-white rounded-lg shadow-md overflow-hidden">
                <div className="px-6 py-4 border-b border-gray-200 flex justify-between items-center">
                  <h3 className="text-lg font-medium text-gray-900">
                    사용자 목록 ({users.length}명)
                  </h3>
                  <div className="flex space-x-2">
                    <button
                      onClick={() => {
                        if (window.confirm(`모든 사용자(${users.filter(u => !u.isAdmin).length}명)를 정말 삭제하시겠습니까?\n\n이 작업은 되돌릴 수 없으며, 모든 좌석 배정도 해제됩니다.`)) {
                          handleBulkDelete('all', { deleteAll: true });
                        }
                      }}
                      className="bg-red-500 hover:bg-red-600 text-white px-4 py-2 rounded flex items-center text-sm"
                      disabled={users.filter(u => !u.isAdmin).length === 0}
                    >
                      <FaTrashAlt className="mr-2" />
                      전체 삭제 ({users.filter(u => !u.isAdmin).length}명)
                    </button>
                  </div>
                </div>
                
              <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-gray-200">
                  <thead className="bg-gray-50">
                    <tr>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          <button
                            onClick={handleSelectAll}
                            className="flex items-center"
                          >
                            {selectedUsers.length === users.filter(u => !u.isAdmin).length && users.filter(u => !u.isAdmin).length > 0 ? 
                              <FaCheckSquare className="text-blue-600" /> : 
                              <FaSquare className="text-gray-400" />
                            }
                          </button>
                        </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">학번/수험번호</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">이름</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">생년월일</th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">우선순위</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">권한</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">작업</th>
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-gray-200">
                    {users.map((user) => (
                        <tr key={user._id} className={`hover:bg-gray-50 ${selectedUsers.includes(user.studentId) ? 'bg-blue-50' : ''}`}>
                          <td className="px-6 py-4 whitespace-nowrap">
                            {!user.isAdmin && (
                              <button
                                onClick={() => handleSelectUser(user.studentId)}
                                className="flex items-center"
                              >
                                {selectedUsers.includes(user.studentId) ? 
                                  <FaCheckSquare className="text-blue-600" /> : 
                                  <FaSquare className="text-gray-400" />
                                }
                              </button>
                            )}
                          </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">{user.studentId}</td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{user.name}</td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{user.birthdate}</td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                          <span className="px-2 inline-flex text-xs leading-5 font-semibold rounded-full bg-blue-100 text-blue-800">
                              {user.priority}순위
                          </span>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                          {user.isAdmin ? 
                            <span className="flex items-center text-blue-600">
                              <FaUserShield className="mr-1" /> 관리자
                            </span> : 
                            <span className="flex items-center text-gray-600">
                              <FaUser className="mr-1" /> 일반 사용자
                            </span>
                          }
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                          <div className="flex space-x-2">
                            <button 
                              onClick={() => handleEditUser(user)}
                              className="text-indigo-600 hover:text-indigo-900" 
                              title="수정"
                            >
                              <FaEdit />
                            </button>
                              {!user.isAdmin && (
                                <>
                                  <button 
                                    onClick={() => handleResetPasswordClick(user)}
                                    className="text-orange-600 hover:text-orange-900" 
                                    title="비밀번호 초기화"
                                  >
                                    <FaKey />
                                  </button>
                                  <button 
                                    onClick={() => handleDeleteClick(user)}
                                    className="text-red-600 hover:text-red-900" 
                                    title="삭제"
                                  >
                                    <FaTrash />
                                  </button>
                                </>
                              )}
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* 사용자 추가 모달 */}
      {showAddModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg shadow-lg p-6 w-full max-w-md">
            <h2 className="text-2xl font-bold mb-4">사용자 추가</h2>
            
            <form onSubmit={handleAddUser}>
              <div className="mb-4">
                <label htmlFor="studentId" className="block text-gray-700 text-sm font-bold mb-2">
                  학번/수험번호
                </label>
                <input
                  type="text"
                  id="studentId"
                  name="studentId"
                  value={newUserData.studentId}
                  onChange={handleInputChange}
                  className="shadow appearance-none border rounded w-full py-2 px-3 text-gray-700 leading-tight focus:outline-none focus:shadow-outline"
                  placeholder="학번 또는 수험번호를 입력하세요"
                  required
                />
              </div>
              
              <div className="mb-4">
                <label htmlFor="name" className="block text-gray-700 text-sm font-bold mb-2">
                  이름
                </label>
                <input
                  type="text"
                  id="name"
                  name="name"
                  value={newUserData.name}
                  onChange={handleInputChange}
                  className="shadow appearance-none border rounded w-full py-2 px-3 text-gray-700 leading-tight focus:outline-none focus:shadow-outline"
                  placeholder="이름을 입력하세요"
                  required
                />
              </div>
              
              <div className="mb-4">
                <label htmlFor="priority" className="block text-gray-700 text-sm font-bold mb-2">
                  유형
                </label>
                <select
                  id="priority"
                  name="priority"
                  value={newUserData.priority}
                  onChange={handleInputChange}
                  className="shadow appearance-none border rounded w-full py-2 px-3 text-gray-700 leading-tight focus:outline-none focus:shadow-outline"
                >
                  <option value={1}>1유형</option>
                  <option value={2}>2유형</option>
                  <option value={3}>3유형</option>
                  <option value={4}>4유형</option>
                  <option value={5}>5유형</option>
                  <option value={6}>6유형</option>
                  <option value={7}>7유형</option>
                  <option value={8}>8유형</option>
                  <option value={9}>9유형</option>
                  <option value={10}>10유형</option>
                  <option value={11}>11유형</option>
                  <option value={12}>12유형</option>
                </select>
              </div>
              
              <div className="mb-6 flex items-center">
                <input
                  type="checkbox"
                  id="isAdmin"
                  name="isAdmin"
                  checked={newUserData.isAdmin}
                  onChange={handleInputChange}
                  className="mr-2"
                />
                <label htmlFor="isAdmin" className="text-gray-700 text-sm font-bold">
                  관리자 권한 부여
                </label>
              </div>
              
              <div className="flex justify-end">
                <button
                  type="button"
                  onClick={() => setShowAddModal(false)}
                  className="bg-gray-300 hover:bg-gray-400 text-gray-800 font-bold py-2 px-4 rounded mr-2"
                >
                  취소
                </button>
                <button
                  type="submit"
                  className="bg-primary hover:bg-blue-700 text-white font-bold py-2 px-4 rounded"
                  disabled={isSubmitting}
                >
                  {isSubmitting ? '처리중...' : '저장'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* 사용자 수정 모달 */}
      {showEditModal && selectedUser && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg shadow-lg p-6 w-full max-w-md">
            <h2 className="text-2xl font-bold mb-4">사용자 수정</h2>
            
            <form onSubmit={handleUpdateUser}>
              <div className="mb-4">
                <label htmlFor="studentId" className="block text-gray-700 text-sm font-bold mb-2">
                  학번/수험번호
                </label>
                <input
                  type="text"
                  id="studentId"
                  name="studentId"
                  value={newUserData.studentId}
                  className="shadow appearance-none border rounded w-full py-2 px-3 text-gray-600 leading-tight focus:outline-none focus:shadow-outline bg-gray-100"
                  disabled
                />
                <p className="text-xs text-gray-500 mt-1">학번/수험번호는 변경할 수 없습니다</p>
              </div>
              
              <div className="mb-4">
                <label htmlFor="name" className="block text-gray-700 text-sm font-bold mb-2">
                  이름
                </label>
                <input
                  type="text"
                  id="name"
                  name="name"
                  value={newUserData.name}
                  onChange={handleInputChange}
                  className="shadow appearance-none border rounded w-full py-2 px-3 text-gray-700 leading-tight focus:outline-none focus:shadow-outline"
                  placeholder="이름을 입력하세요"
                  required
                />
              </div>
              
              <div className="mb-4">
                <label htmlFor="priority" className="block text-gray-700 text-sm font-bold mb-2">
                  유형
                </label>
                <select
                  id="priority"
                  name="priority"
                  value={newUserData.priority}
                  onChange={handleInputChange}
                  className="shadow appearance-none border rounded w-full py-2 px-3 text-gray-700 leading-tight focus:outline-none focus:shadow-outline"
                >
                  <option value={1}>1유형</option>
                  <option value={2}>2유형</option>
                  <option value={3}>3유형</option>
                  <option value={4}>4유형</option>
                  <option value={5}>5유형</option>
                  <option value={6}>6유형</option>
                  <option value={7}>7유형</option>
                  <option value={8}>8유형</option>
                  <option value={9}>9유형</option>
                  <option value={10}>10유형</option>
                  <option value={11}>11유형</option>
                  <option value={12}>12유형</option>
                </select>
              </div>
              
              <div className="mb-6 flex items-center">
                <input
                  type="checkbox"
                  id="isAdmin"
                  name="isAdmin"
                  checked={newUserData.isAdmin}
                  onChange={handleInputChange}
                  className="mr-2"
                />
                <label htmlFor="isAdmin" className="text-gray-700 text-sm font-bold">
                  관리자 권한 부여
                </label>
              </div>
              
              <div className="flex justify-end">
                <button
                  type="button"
                  onClick={() => setShowEditModal(false)}
                  className="bg-gray-300 hover:bg-gray-400 text-gray-800 font-bold py-2 px-4 rounded mr-2"
                >
                  취소
                </button>
                <button
                  type="submit"
                  className="bg-primary hover:bg-blue-700 text-white font-bold py-2 px-4 rounded"
                  disabled={isSubmitting}
                >
                  {isSubmitting ? '처리중...' : '저장'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* 사용자 삭제 확인 모달 */}
      {showDeleteModal && selectedUser && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg shadow-lg p-6 w-full max-w-md">
            <h2 className="text-2xl font-bold mb-4 text-red-600">사용자 삭제</h2>
            <p className="mb-6 text-gray-700">
              <strong>{selectedUser.name}</strong> ({selectedUser.studentId}) 사용자를 정말 삭제하시겠습니까? 이 작업은 되돌릴 수 없습니다.
            </p>
            
            <div className="flex justify-end">
              <button
                type="button"
                onClick={() => setShowDeleteModal(false)}
                className="bg-gray-300 hover:bg-gray-400 text-gray-800 font-bold py-2 px-4 rounded mr-2"
              >
                취소
              </button>
              <button
                type="button"
                onClick={handleDeleteUser}
                className="bg-red-600 hover:bg-red-700 text-white font-bold py-2 px-4 rounded"
                disabled={isSubmitting}
              >
                {isSubmitting ? '처리중...' : '삭제'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 비밀번호 초기화 확인 모달 */}
      {showResetPasswordModal && selectedUser && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg shadow-lg p-6 w-full max-w-md">
            <h2 className="text-2xl font-bold mb-4 text-orange-600">비밀번호 초기화</h2>
            <p className="mb-6 text-gray-700">
              <strong>{selectedUser.name}</strong> ({selectedUser.studentId}) 사용자의 비밀번호를 초기값으로 재설정하시겠습니까?
            </p>
            <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-3 mb-4">
              <p className="text-sm text-yellow-800">
                비밀번호가 <strong>sg1234</strong>로 재설정됩니다.
              </p>
            </div>
            
            <div className="flex justify-end">
              <button
                type="button"
                onClick={() => setShowResetPasswordModal(false)}
                className="bg-gray-300 hover:bg-gray-400 text-gray-800 font-bold py-2 px-4 rounded mr-2"
              >
                취소
              </button>
              <button
                type="button"
                onClick={handleResetPassword}
                className="bg-orange-600 hover:bg-orange-700 text-white font-bold py-2 px-4 rounded"
                disabled={isSubmitting}
              >
                {isSubmitting ? '처리중...' : '초기화'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 일괄 삭제 확인 모달 */}
      {showBulkDeleteModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg shadow-lg p-6 w-full max-w-md">
            <h2 className="text-2xl font-bold mb-4 text-red-600">일괄 삭제 확인</h2>
            <p className="mb-6 text-gray-700">
              선택된 <strong>{selectedUsers.length}명</strong>의 사용자를 정말 삭제하시겠습니까? 
              <br />
              <span className="text-red-600 font-semibold">이 작업은 되돌릴 수 없으며, 해당 사용자들에게 배정된 좌석도 모두 해제됩니다.</span>
            </p>
            
            <div className="flex justify-end">
              <button
                type="button"
                onClick={() => setShowBulkDeleteModal(false)}
                className="bg-gray-300 hover:bg-gray-400 text-gray-800 font-bold py-2 px-4 rounded mr-2"
              >
                취소
              </button>
              <button
                type="button"
                onClick={() => handleBulkDelete('selected', { userIds: selectedUsers })}
                className="bg-red-600 hover:bg-red-700 text-white font-bold py-2 px-4 rounded"
                disabled={isSubmitting}
              >
                {isSubmitting ? '처리중...' : '삭제'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* CSV 일괄 업로드 모달 */}
      {showBulkModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg shadow-lg p-6 w-full max-w-4xl max-h-[80vh] overflow-y-auto">
            <h2 className="text-2xl font-bold mb-4">CSV 일괄 업로드</h2>
            
            {/* 초기 비밀번호 안내 */}
            <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-3 mb-4">
              <div className="flex">
                <div className="flex-shrink-0">
                  <svg className="h-5 w-5 text-yellow-400" viewBox="0 0 20 20" fill="currentColor">
                    <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
                  </svg>
                </div>
                <div className="ml-3">
                  <p className="text-sm text-yellow-800">
                    모든 새 사용자의 초기 비밀번호는 <strong>sg1234</strong>로 자동 설정됩니다.
                  </p>
                </div>
              </div>
            </div>
            
            {csvErrors.length > 0 && (
              <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded mb-4">
                <h3 className="font-bold">오류가 발견되었습니다:</h3>
                <ul className="list-disc list-inside mt-2">
                  {csvErrors.map((error, index) => (
                    <li key={index}>{error}</li>
                  ))}
                </ul>
              </div>
            )}
            
            <div className="mb-4">
              <div className="flex justify-between items-center mb-2">
                <h3 className="text-lg font-semibold">미리보기 ({csvData.length}개 행, {selectedCsvUsers.length}개 선택)</h3>
                <button
                  type="button"
                  onClick={handleSelectAllCsvUsers}
                  className="text-sm text-blue-600 hover:text-blue-800 font-medium"
                >
                  {selectedCsvUsers.length === csvData.length ? '전체 해제' : '전체 선택'}
                </button>
              </div>
              <div className="overflow-x-auto max-h-96">
                <table className="min-w-full divide-y divide-gray-200 border">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">
                        <input
                          type="checkbox"
                          checked={selectedCsvUsers.length === csvData.length && csvData.length > 0}
                          onChange={handleSelectAllCsvUsers}
                          className="rounded"
                        />
                      </th>
                      <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">학번/수험번호</th>
                      <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">이름</th>
                      <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">생년월일</th>
                      <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">우선순위</th>
                      <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">관리자</th>
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-gray-200">
                    {csvData.map((row, index) => (
                      <tr key={index} className={`hover:bg-gray-50 ${selectedCsvUsers.includes(index) ? 'bg-blue-50' : ''}`}>
                        <td className="px-4 py-2 text-sm">
                          <input
                            type="checkbox"
                            checked={selectedCsvUsers.includes(index)}
                            onChange={() => handleSelectCsvUser(index)}
                            className="rounded"
                          />
                        </td>
                        <td className="px-4 py-2 text-sm text-gray-900">{row.studentId || '-'}</td>
                        <td className="px-4 py-2 text-sm text-gray-900">{row.name || '-'}</td>
                        <td className="px-4 py-2 text-sm text-gray-900">{row.birthdate || '-'}</td>
                        <td className="px-4 py-2 text-sm text-gray-900">{row.priority || '-'}</td>
                        <td className="px-4 py-2 text-sm text-gray-900">{row.isAdmin || 'false'}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
            
            <div className="flex justify-end space-x-2">
              <button
                type="button"
                onClick={() => {
                  setShowBulkModal(false);
                  setCsvData([]);
                  setCsvErrors([]);
                  setSelectedCsvUsers([]);
                  setDuplicateUsers([]);
                  setDuplicateAction('skip');
                }}
                className="bg-gray-300 hover:bg-gray-400 text-gray-800 font-bold py-2 px-4 rounded"
              >
                취소
              </button>
              <button
                type="button"
                onClick={handleBulkSubmitWithDuplicateCheck}
                className="bg-primary hover:bg-blue-700 text-white font-bold py-2 px-4 rounded"
                disabled={isSubmitting || csvErrors.length > 0 || selectedCsvUsers.length === 0}
              >
                {isSubmitting ? '처리 중...' : `선택된 ${selectedCsvUsers.length}명 일괄 등록`}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 중복 사용자 확인 모달 */}
      {showDuplicateModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg shadow-lg p-6 w-full max-w-2xl max-h-[80vh] overflow-y-auto">
            <h2 className="text-2xl font-bold mb-4 text-orange-600">중복 사용자 발견</h2>
            
            <div className="bg-orange-50 border border-orange-200 rounded-lg p-4 mb-4">
              <div className="flex">
                <div className="flex-shrink-0">
                  <svg className="h-5 w-5 text-orange-400" viewBox="0 0 20 20" fill="currentColor">
                    <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
                  </svg>
                </div>
                <div className="ml-3">
                  <h3 className="text-sm font-medium text-orange-800">중복된 사용자가 발견되었습니다</h3>
                  <div className="mt-2 text-sm text-orange-700">
                    <p>다음 사용자들은 이미 시스템에 등록되어 있습니다:</p>
                  </div>
                </div>
              </div>
            </div>

            <div className="mb-4">
              <h3 className="text-lg font-semibold mb-2">중복된 사용자 목록</h3>
              <div className="overflow-x-auto max-h-60">
                <table className="min-w-full divide-y divide-gray-200 border">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">행 번호</th>
                      <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">학번/수험번호</th>
                      <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">이름</th>
                      <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">상태</th>
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-gray-200">
                    {duplicateUsers.map((user, index) => (
                      <tr key={index} className="hover:bg-gray-50">
                        <td className="px-4 py-2 text-sm text-gray-900">행 {user.rowIndex}</td>
                        <td className="px-4 py-2 text-sm text-gray-900">{user.studentId}</td>
                        <td className="px-4 py-2 text-sm text-gray-900">{user.name}</td>
                        <td className="px-4 py-2 text-sm">
                          <span className="px-2 inline-flex text-xs leading-5 font-semibold rounded-full bg-red-100 text-red-800">
                            중복됨
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>

            <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-4">
              <h4 className="text-sm font-medium text-blue-800 mb-3">중복 처리 방식을 선택하세요:</h4>
              
              <div className="space-y-3">
                <label className="flex items-start space-x-3 cursor-pointer">
                  <input
                    type="radio"
                    name="duplicateAction"
                    value="skip"
                    checked={duplicateAction === 'skip'}
                    onChange={(e) => setDuplicateAction(e.target.value)}
                    className="mt-1"
                  />
                  <div>
                    <div className="text-sm font-medium text-blue-800">중복 사용자 건너뛰기 (권장)</div>
                    <div className="text-xs text-blue-600">기존 사용자 정보를 유지하고, 중복되지 않은 새로운 사용자만 추가합니다.</div>
                  </div>
                </label>
                
                <label className="flex items-start space-x-3 cursor-pointer">
                  <input
                    type="radio"
                    name="duplicateAction"
                    value="update"
                    checked={duplicateAction === 'update'}
                    onChange={(e) => setDuplicateAction(e.target.value)}
                    className="mt-1"
                  />
                  <div>
                    <div className="text-sm font-medium text-blue-800">기존 사용자 정보 업데이트</div>
                    <div className="text-xs text-blue-600">기존 사용자의 정보를 CSV의 새로운 정보로 덮어씁니다. 비밀번호도 초기화됩니다.</div>
                  </div>
                </label>
                
                <label className="flex items-start space-x-3 cursor-pointer">
                  <input
                    type="radio"
                    name="duplicateAction"
                    value="error"
                    checked={duplicateAction === 'error'}
                    onChange={(e) => setDuplicateAction(e.target.value)}
                    className="mt-1"
                  />
                  <div>
                    <div className="text-sm font-medium text-blue-800">중복 시 오류 처리</div>
                    <div className="text-xs text-blue-600">중복된 사용자가 있으면 전체 등록을 취소하고 오류 메시지를 표시합니다.</div>
                  </div>
                </label>
              </div>
            </div>

            <div className="flex justify-end space-x-2">
              <button
                type="button"
                onClick={() => {
                  setShowDuplicateModal(false);
                  setDuplicateUsers([]);
                  setDuplicateAction('skip');
                }}
                className="bg-gray-300 hover:bg-gray-400 text-gray-800 font-bold py-2 px-4 rounded"
              >
                취소
              </button>
              <button
                type="button"
                onClick={() => proceedWithRegistration(duplicateAction)}
                className="bg-primary hover:bg-blue-700 text-white font-bold py-2 px-4 rounded"
                disabled={isSubmitting}
              >
                {isSubmitting ? '처리 중...' : '선택한 방식으로 처리'}
              </button>
            </div>
          </div>
        </div>
      )}
    </Layout>
  );
} 