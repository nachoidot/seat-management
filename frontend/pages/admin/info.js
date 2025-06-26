import { useState, useEffect } from 'react';
import { useRouter } from 'next/router';
import Layout from '../../components/Layout';
import AdminNav from '../../components/AdminNav';
import { getAdminInfo, updateAdminInfo } from '../../utils/api';
import { isAuthenticated, getCurrentUser } from '../../utils/auth';
import { toast } from 'react-toastify';
import { FaUser, FaPhone, FaEnvelope, FaBuilding, FaUserTie, FaSave } from 'react-icons/fa';
import { ClientOnly } from '../../utils/client-only';

export default function AdminInfo() {
  const [adminInfo, setAdminInfo] = useState({
    name: '',
    phone: '',
    email: '',
    department: '',
    position: ''
  });
  const [loading, setLoading] = useState(true);
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

        await loadAdminInfo();
      } catch (error) {
        console.error('인증 오류:', error);
      }
    };

    checkAuthAndLoadData();
  }, []);

  const loadAdminInfo = async () => {
    try {
      setLoading(true);
      const response = await getAdminInfo();
      if (response.success) {
        setAdminInfo(response.data);
      }
    } catch (error) {
      console.error('관리자 정보 로드 오류:', error);
      toast.error('관리자 정보를 불러오는 중 오류가 발생했습니다.');
    } finally {
      setLoading(false);
    }
  };

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setAdminInfo(prev => ({
      ...prev,
      [name]: value
    }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (!adminInfo.name || !adminInfo.phone || !adminInfo.email) {
      toast.error('이름, 전화번호, 이메일은 필수 입력 항목입니다.');
      return;
    }

    try {
      setIsSubmitting(true);
      const response = await updateAdminInfo(adminInfo);
      
      if (response.success) {
        toast.success('관리자 정보가 성공적으로 업데이트되었습니다.');
        setAdminInfo(response.data);
      }
    } catch (error) {
      console.error('관리자 정보 업데이트 오류:', error);
      toast.error(error.response?.data?.message || '관리자 정보 업데이트 중 오류가 발생했습니다.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Layout title="관리자 정보 - 연구실 자리 배정 시스템">
      <ClientOnly>
        <AdminNav />
      </ClientOnly>
      
      <div className="min-h-screen bg-gray-100 md:ml-64">
        <div className="container mx-auto px-4 py-8">
          <div className="flex justify-between items-center mb-8">
            <h1 className="text-3xl font-bold text-primary">관리자 정보</h1>
          </div>
          
          {loading ? (
            <div className="text-center py-12">
              <p className="text-gray-600">관리자 정보를 불러오는 중...</p>
            </div>
          ) : (
            <div className="bg-white rounded-lg shadow-md p-8 max-w-2xl mx-auto">
              <div className="mb-6">
                <h2 className="text-xl font-semibold text-gray-800 mb-2">연락처 정보 관리</h2>
                <p className="text-gray-600">로그인 페이지에 표시될 관리자 연락처 정보를 입력하세요.</p>
              </div>

              <form onSubmit={handleSubmit} className="space-y-6">
                <div>
                  <label htmlFor="name" className="flex items-center text-gray-700 text-sm font-bold mb-2">
                    <FaUser className="mr-2 text-blue-500" />
                    이름 *
                  </label>
                  <input
                    type="text"
                    id="name"
                    name="name"
                    value={adminInfo.name}
                    onChange={handleInputChange}
                    className="shadow appearance-none border rounded w-full py-3 px-4 text-gray-700 leading-tight focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    placeholder="관리자 이름을 입력하세요"
                    required
                  />
                </div>

                <div>
                  <label htmlFor="phone" className="flex items-center text-gray-700 text-sm font-bold mb-2">
                    <FaPhone className="mr-2 text-green-500" />
                    전화번호 *
                  </label>
                  <input
                    type="tel"
                    id="phone"
                    name="phone"
                    value={adminInfo.phone}
                    onChange={handleInputChange}
                    className="shadow appearance-none border rounded w-full py-3 px-4 text-gray-700 leading-tight focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    placeholder="02-0000-0000"
                    required
                  />
                </div>

                <div>
                  <label htmlFor="email" className="flex items-center text-gray-700 text-sm font-bold mb-2">
                    <FaEnvelope className="mr-2 text-red-500" />
                    이메일 *
                  </label>
                  <input
                    type="email"
                    id="email"
                    name="email"
                    value={adminInfo.email}
                    onChange={handleInputChange}
                    className="shadow appearance-none border rounded w-full py-3 px-4 text-gray-700 leading-tight focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    placeholder="admin@sogang.ac.kr"
                    required
                  />
                </div>

                <div>
                  <label htmlFor="department" className="flex items-center text-gray-700 text-sm font-bold mb-2">
                    <FaBuilding className="mr-2 text-purple-500" />
                    학과/부서
                  </label>
                  <input
                    type="text"
                    id="department"
                    name="department"
                    value={adminInfo.department}
                    onChange={handleInputChange}
                    className="shadow appearance-none border rounded w-full py-3 px-4 text-gray-700 leading-tight focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    placeholder="경제학과"
                  />
                </div>

                <div>
                  <label htmlFor="position" className="flex items-center text-gray-700 text-sm font-bold mb-2">
                    <FaUserTie className="mr-2 text-orange-500" />
                    직책
                  </label>
                  <input
                    type="text"
                    id="position"
                    name="position"
                    value={adminInfo.position}
                    onChange={handleInputChange}
                    className="shadow appearance-none border rounded w-full py-3 px-4 text-gray-700 leading-tight focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    placeholder="주임조교"
                  />
                </div>

                <div className="pt-4">
                  <button
                    type="submit"
                    className="w-full bg-primary hover:bg-blue-700 text-white font-bold py-3 px-6 rounded focus:outline-none focus:shadow-outline flex items-center justify-center"
                    disabled={isSubmitting}
                  >
                    {isSubmitting ? (
                      '저장 중...'
                    ) : (
                      <>
                        <FaSave className="mr-2" />
                        저장
                      </>
                    )}
                  </button>
                </div>
              </form>

              <div className="mt-8 p-4 bg-blue-50 rounded-lg">
                <h3 className="text-lg font-semibold text-blue-800 mb-2">미리보기</h3>
                <p className="text-blue-700">
                  {adminInfo.department} {adminInfo.position} {adminInfo.name} : {adminInfo.phone} ({adminInfo.email})
                </p>
                <p className="text-sm text-blue-600 mt-2">
                  ※ 이 정보가 로그인 페이지에 표시됩니다.
                </p>
              </div>
            </div>
          )}
        </div>
      </div>
    </Layout>
  );
} 