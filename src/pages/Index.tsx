import { useEffect, useState } from 'react';
import { Chatbox } from '@/components/Chatbox';
import { PasswordProtection } from '@/components/PasswordProtection';
import { UserRole } from '@/types/auth';

const Index = () => {
  const [isPasswordVerified, setIsPasswordVerified] = useState(false);
  const [userRole, setUserRole] = useState<UserRole | null>(null);

  useEffect(() => {
    // Check if password was already verified
    const verified = localStorage.getItem('password_verified');
    const role = localStorage.getItem('user_role') as UserRole;
    if (verified === 'true' && role) {
      setIsPasswordVerified(true);
      setUserRole(role);
    }

    // Update document title
    document.title = 'DESIGN24 - AI Chat Assistant for Tour Guides';
    
    // Update meta description
    const metaDescription = document.querySelector('meta[name="description"]');
    if (metaDescription) {
      metaDescription.setAttribute('content', 'Professional AI chatbox for DESIGN24\'s AI Skills for Tour Guides course. Learn digital marketing, photography, AI tools, and more for tourism professionals.');
    }
  }, []);

  const handlePasswordCorrect = (role: UserRole) => {
    setIsPasswordVerified(true);
    setUserRole(role);
  };

  if (!isPasswordVerified || !userRole) {
    return <PasswordProtection onPasswordCorrect={handlePasswordCorrect} />;
  }

  return <Chatbox userRole={userRole} />;
};

export default Index;
