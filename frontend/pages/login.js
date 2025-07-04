import { useState, useEffect } from 'react';
import { useRouter } from 'next/router';
import Layout from '../components/Layout';
import { login, getAdminInfo } from '../utils/api';
import { isAuthenticated, setToken } from '../utils/auth';
import { toast } from 'react-toastify';

export default function Login() {
  const [formData, setFormData] = useState({
    studentId: '',
    name: '',
    password: ''
  });
  const [loading, setLoading] = useState(false);
  const [adminInfo, setAdminInfo] = useState(null);
  const [authLoading, setAuthLoading] = useState(true);
  const router = useRouter();

  useEffect(() => {
    // Check if already logged in
    const checkAuth = async () => {
      const authenticated = await isAuthenticated();
      if (authenticated) {
        router.push('/');
      }
      setAuthLoading(false);
    };

    checkAuth();

    // 관리자 정보 로드
    loadAdminInfo();
  }, []);

  const loadAdminInfo = async () => {
    try {
      const response = await getAdminInfo();
      if (response.success) {
        setAdminInfo(response.data);
      }
    } catch (error) {
      console.error('관리자 정보 로드 실패:', error);
      // 에러가 발생해도 로그인 페이지는 정상 표시
    }
  };

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData({
      ...formData,
      [name]: value
    });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (!formData.studentId || !formData.name || !formData.password) {
      toast.error('학번, 이름, 비밀번호를 모두 입력해주세요.');
      return;
    }
    
    try {
      setLoading(true);
      const response = await login(
        formData.studentId, 
        formData.name, 
        formData.password
      );
      
      if (response.success) {
        if (response.token) {
          setToken(response.token);
        }
        toast.success('로그인 성공!');
        
        // 관리자인 경우 관리자 대시보드로 리디렉션, 일반 사용자는 메인 페이지로 리디렉션
        if (response.user.isAdmin) {
          router.push('/admin');
        } else {
          router.push('/');
        }
      }
    } catch (error) {
      console.error('Login error:', error);
      toast.error(error.response?.data?.message || '로그인 실패. 입력 정보를 확인해주세요.');
    } finally {
      setLoading(false);
    }
  };

  if (authLoading) {
    return (
      <Layout title="로그인 - 연구실 자리 배정 시스템">
        <div className="flex items-center justify-center min-h-screen">
          <div className="text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto"></div>
            <p className="mt-4 text-gray-600">로딩 중...</p>
          </div>
        </div>
      </Layout>
    );
  }

  return (
    <Layout title="로그인 - 연구실 자리 배정 시스템">
      <div className="flex items-center justify-center min-h-screen bg-secondary">
        <div className="w-full max-w-md">
          <div className="bg-white rounded-lg shadow-lg p-8">
            <div className="text-center mb-8">
              <div className="flex justify-center mb-4">
                <img src="/images/logo.png" alt="서강대학교 로고" className="h-24 w-auto" />
              </div>
              <h1 className="text-3xl font-bold text-primary">연구실 자리 배정 시스템</h1>
              <p className="text-gray-600 mt-2">학번, 이름, 비밀번호로 로그인하세요</p>
            </div>
            
            <form onSubmit={handleSubmit}>
              <div className="mb-4">
                <label htmlFor="studentId" className="block text-gray-700 text-sm font-bold mb-2">
                  학번/수험번호 *
                </label>
                <input
                  type="text"
                  id="studentId"
                  name="studentId"
                  value={formData.studentId}
                  onChange={handleChange}
                  className="shadow appearance-none border rounded w-full py-2 px-3 text-gray-700 leading-tight focus:outline-none focus:shadow-outline"
                  placeholder="학번 또는 수험번호를 입력하세요"
                  required
                />
              </div>
              
              <div className="mb-4">
                <label htmlFor="name" className="block text-gray-700 text-sm font-bold mb-2">
                  이름 *
                </label>
                <input
                  type="text"
                  id="name"
                  name="name"
                  value={formData.name}
                  onChange={handleChange}
                  className="shadow appearance-none border rounded w-full py-2 px-3 text-gray-700 leading-tight focus:outline-none focus:shadow-outline"
                  placeholder="이름을 입력하세요"
                  required
                />
              </div>

              <div className="mb-6">
                <label htmlFor="password" className="block text-gray-700 text-sm font-bold mb-2">
                  비밀번호 *
                </label>
                <input
                  type="password"
                  id="password"
                  name="password"
                  value={formData.password}
                  onChange={handleChange}
                  className="shadow appearance-none border rounded w-full py-2 px-3 text-gray-700 leading-tight focus:outline-none focus:shadow-outline"
                  placeholder="비밀번호를 입력하세요"
                  required
                />
              </div>
              
              <div className="flex items-center justify-between">
                <button
                  type="submit"
                  className={`bg-primary hover:bg-blue-700 text-white font-bold py-2 px-4 rounded focus:outline-none focus:shadow-outline w-full ${loading ? 'opacity-70 cursor-not-allowed' : ''}`}
                  disabled={loading}
                >
                  {loading ? '로그인 중...' : '로그인'}
                </button>
              </div>
            </form>
            
            <div className="text-center mt-6 text-sm text-gray-600">
              <p className="mb-2">로그인에 문제가 있으시면 관리자에게 문의하세요.</p>
              {adminInfo && (
                <div className="bg-gray-50 p-3 rounded-lg">
                  <p className="font-medium text-gray-800">
                    {adminInfo.department} {adminInfo.position} {adminInfo.name} : {adminInfo.phone} ({adminInfo.email})
                  </p>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </Layout>
  );
} 