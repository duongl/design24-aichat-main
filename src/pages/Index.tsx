import { useEffect, useState } from 'react';
import { Chatbox } from '@/components/Chatbox';
import { UserRole } from '@/types/auth';

const Index = () => {
  const [userRole, setUserRole] = useState<UserRole>(UserRole.USER);

  useEffect(() => {
    // Set default user role and mark as verified
    localStorage.setItem('password_verified', 'true');
    localStorage.setItem('user_role', UserRole.USER);
    setUserRole(UserRole.USER);

    // Update document title
    document.title = 'DESIGN24 - AI Chat Assistant for Tour Guides';
    
    // Update meta description
    const metaDescription = document.querySelector('meta[name="description"]');
    if (metaDescription) {
      metaDescription.setAttribute('content', 'Professional AI chatbox for DESIGN24\'s AI Skills for Tour Guides course. Learn digital marketing, photography, AI tools, and more for tourism professionals.');
    }
  }, []);

  return <Chatbox userRole={userRole} />;
};

export default Index;
