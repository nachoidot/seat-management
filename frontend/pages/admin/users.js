import { useState, useEffect } from 'react';
import { useRouter } from 'next/router';
import Layout from '../../components/Layout';
import AdminNav from '../../components/AdminNav';
import { getUsers, createUser, deleteUser, updateUser, bulkCreateUsers } from '../../utils/api';
import { isAuthenticated, getCurrentUser } from '../../utils/auth';
import { toast } from 'react-toastify';
import { FaPlus, FaTrash, FaEdit, FaUserShield, FaUser, FaUpload, FaDownload } from 'react-icons/fa';
import { ClientOnly } from '../../utils/client-only';

export default function AdminUsers() {
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showAddModal, setShowAddModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [showBulkModal, setShowBulkModal] = useState(false);
  const [selectedUser, setSelectedUser] = useState(null);
  const [dragActive, setDragActive] = useState(false);
  const [csvData, setCsvData] = useState([]);
  const [csvErrors, setCsvErrors] = useState([]);
  const [newUserData, setNewUserData] = useState({
    studentId: '',
    name: '',
    birthdate: '',
    priority: 3,
    isAdmin: false
  });
  const [isSubmitting, setIsSubmitting] = useState(false);
  
  const router = useRouter();

  useEffect(() => {
    const checkAuthAndLoadData = async () => {
      try {
        // 로그인 확인
        const isAuth = isAuthenticated();
        if (!isAuth) {
          router.push('/login');
          return;
        }

        // 사용자 정보 가져오기
        const user = getCurrentUser();
        
        // 관리자 권한 확인
        if (!user || !user.isAdmin) {
          toast.error('관리자 권한이 필요합니다.');
          router.push('/');
          return;
        }

        await loadUsers();
      } catch (error) {
        console.error('인증 오류:', error);
      }
    };

    checkAuthAndLoadData();
  }, []);

  const loadUsers = async () => {
    try {
      setLoading(true);
      const response = await getUsers();
      setUsers(response.data || []);
    } catch (error) {
      console.error('사용자 로드 오류:', error);
      toast.error('사용자 정보를 불러오는 중 오류가 발생했습니다.');
    } finally {
      setLoading(false);
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
    
    if (!newUserData.studentId || !newUserData.name || !newUserData.birthdate) {
      toast.error('학번/수험번호, 이름, 생년월일을 모두 입력해주세요.');
      return;
    }

    // 생년월일 형식 확인 (YYYYMMDD)
    if (!/^\d{8}$/.test(newUserData.birthdate)) {
      toast.error('생년월일은 YYYYMMDD 형식의 8자리 숫자로 입력해주세요.');
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
    
    if (!newUserData.name || !newUserData.birthdate) {
      toast.error('이름과 생년월일을 입력해주세요.');
      return;
    }

    // 생년월일 형식 확인 (YYYYMMDD)
    if (!/^\d{8}$/.test(newUserData.birthdate)) {
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
      '생년월일': 'birthdate',
      'birthdate': 'birthdate',
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
        setShowBulkModal(true);
      } catch (error) {
        console.error('CSV 파싱 오류:', error);
        toast.error('CSV 파일을 읽는 중 오류가 발생했습니다.');
      }
    };
    reader.readAsText(file);
  };

  const handleBulkSubmit = async () => {
    try {
      setIsSubmitting(true);
      const response = await bulkCreateUsers(csvData);
      
      toast.success(response.message);
      setShowBulkModal(false);
      setCsvData([]);
      setCsvErrors([]);
      await loadUsers();
    } catch (error) {
      console.error('일괄 업로드 오류:', error);
      if (error.response?.data?.errors) {
        setCsvErrors(error.response.data.errors);
      } else {
        toast.error(error.response?.data?.message || '일괄 업로드 중 오류가 발생했습니다.');
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  const downloadTemplate = () => {
    const template = '학번,이름,생년월일,우선순위,관리자\n2021001,홍길동,19950101,3,false\n2021002,김철수,19940215,1,false';
    const blob = new Blob([template], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    if (link.download !== undefined) {
      const url = URL.createObjectURL(blob);
      link.setAttribute('href', url);
      link.setAttribute('download', 'user_template.csv');
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
          <div className="flex justify-between items-center mb-8">
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
            <div className="bg-white rounded-lg shadow-md overflow-hidden">
              <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-gray-200">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">학번/수험번호</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">이름</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">생년월일</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">유형</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">권한</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">작업</th>
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-gray-200">
                    {users.map((user) => (
                      <tr key={user._id} className="hover:bg-gray-50">
                        <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">{user.studentId}</td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{user.name}</td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{user.birthdate}</td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                          <span className="px-2 inline-flex text-xs leading-5 font-semibold rounded-full bg-blue-100 text-blue-800">
                            {user.priority}유형
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
                            <button 
                              onClick={() => handleDeleteClick(user)}
                              className="text-red-600 hover:text-red-900" 
                              title="삭제"
                            >
                              <FaTrash />
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
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
                <label htmlFor="birthdate" className="block text-gray-700 text-sm font-bold mb-2">
                  생년월일 (YYYYMMDD)
                </label>
                <input
                  type="text"
                  id="birthdate"
                  name="birthdate"
                  value={newUserData.birthdate}
                  onChange={handleInputChange}
                  className="shadow appearance-none border rounded w-full py-2 px-3 text-gray-700 leading-tight focus:outline-none focus:shadow-outline"
                  placeholder="생년월일 8자리 (예: 19950101)"
                  required
                  pattern="[0-9]{8}"
                  title="생년월일은 YYYYMMDD 형식의 8자리 숫자로 입력해주세요"
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
                <label htmlFor="birthdate" className="block text-gray-700 text-sm font-bold mb-2">
                  생년월일 (YYYYMMDD)
                </label>
                <input
                  type="text"
                  id="birthdate"
                  name="birthdate"
                  value={newUserData.birthdate}
                  onChange={handleInputChange}
                  className="shadow appearance-none border rounded w-full py-2 px-3 text-gray-700 leading-tight focus:outline-none focus:shadow-outline"
                  placeholder="생년월일 8자리 (예: 19950101)"
                  required
                  pattern="[0-9]{8}"
                  title="생년월일은 YYYYMMDD 형식의 8자리 숫자로 입력해주세요"
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

      {/* CSV 일괄 업로드 모달 */}
      {showBulkModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg shadow-lg p-6 w-full max-w-4xl max-h-[80vh] overflow-y-auto">
            <h2 className="text-2xl font-bold mb-4">CSV 일괄 업로드</h2>
            
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
              <h3 className="text-lg font-semibold mb-2">미리보기 ({csvData.length}개 행)</h3>
              <div className="overflow-x-auto max-h-96">
                <table className="min-w-full divide-y divide-gray-200 border">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">학번/수험번호</th>
                      <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">이름</th>
                      <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">생년월일</th>
                      <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">우선순위</th>
                      <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">관리자</th>
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-gray-200">
                    {csvData.map((row, index) => (
                      <tr key={index} className="hover:bg-gray-50">
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
                }}
                className="bg-gray-300 hover:bg-gray-400 text-gray-800 font-bold py-2 px-4 rounded"
              >
                취소
              </button>
              <button
                type="button"
                onClick={handleBulkSubmit}
                className="bg-primary hover:bg-blue-700 text-white font-bold py-2 px-4 rounded"
                disabled={isSubmitting || csvErrors.length > 0}
              >
                {isSubmitting ? '업로드 중...' : `${csvData.length}명 일괄 등록`}
              </button>
            </div>
          </div>
        </div>
      )}
    </Layout>
  );
} 