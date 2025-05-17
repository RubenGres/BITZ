// hooks/useResponsive.ts
import { useState, useEffect } from 'react';

export const useResponsive = (): { isMobile: boolean } => {
    const [isMobile, setIsMobile] = useState(false);
    
    useEffect(() => {
        const checkIfMobile = () => {
            setIsMobile(window.innerWidth < 768);
        };
        
        checkIfMobile();
        window.addEventListener('resize', checkIfMobile);
        
        return () => {
            window.removeEventListener('resize', checkIfMobile);
        };
    }, []);
    
    return { isMobile };
};