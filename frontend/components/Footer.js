import { useState, useEffect } from 'react';

const Footer = () => {
  const [year, setYear] = useState('');
  const isClient = typeof window !== 'undefined';
  
  useEffect(() => {
    if (isClient) {
      setYear(new Date().getFullYear().toString());
    }
  }, [isClient]);

  // 서버 사이드에서는 고정된 값을 사용
  const currentYear = isClient ? year : '2023';

  return (
    <footer className="bg-neutral text-white py-6">
      <div className="container mx-auto px-4">
        <div className="flex flex-col md:flex-row justify-between items-center">
          <div>
            <p className="text-sm">
              &copy; {currentYear} 연구실 자리 배정 시스템. All rights reserved.
            </p>
          </div>
          <div className="mt-4 md:mt-0">
            <p className="text-sm">
              Developed for Graduate Program
            </p>
          </div>
        </div>
      </div>
    </footer>
  );
};

export default Footer; 