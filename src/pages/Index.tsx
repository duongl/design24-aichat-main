import { useEffect, useState } from 'react';
import { Chatbox } from '@/components/Chatbox';
import { PasswordProtection } from '@/components/PasswordProtection';

const Index = () => {
  const [isPasswordVerified, setIsPasswordVerified] = useState(false);

  useEffect(() => {
    // Check if password was already verified
    const verified = localStorage.getItem('password_verified');
    if (verified === 'true') {
      setIsPasswordVerified(true);
    }

    // Update document title
    document.title = 'DESIGN24 - AI Chat Assistant for Tour Guides';
    
    // Update meta description
    const metaDescription = document.querySelector('meta[name="description"]');
    if (metaDescription) {
      metaDescription.setAttribute('content', 'Professional AI chatbox for DESIGN24\'s AI Skills for Tour Guides course. Learn digital marketing, photography, AI tools, and more for tourism professionals.');
    }
  }, []);

  const handlePasswordCorrect = () => {
    setIsPasswordVerified(true);
  };

  if (!isPasswordVerified) {
    return <PasswordProtection onPasswordCorrect={handlePasswordCorrect} />;
  }

  return <Chatbox />;
};

export default Index;
