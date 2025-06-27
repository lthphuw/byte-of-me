// app/contexts/ExperimentalContext.tsx
'use client';

import React, {
  ReactNode,
  createContext,
  useContext,
  useEffect,
  useState,
} from 'react';

interface ExperimentalContextType {
  isExperimentalMode: boolean;
  toggleExperimentalMode: () => void;
  throwRandomError: () => void;
}

const ExperimentalContext = createContext<ExperimentalContextType | undefined>(
  undefined
);

const errors: Error[] = [
  new Error('Lỗi ngẫu nhiên 1: Có gì đó sai sai!'),
  new TypeError('Lỗi ngẫu nhiên 2: Sai kiểu dữ liệu!'),
  new RangeError('Lỗi ngẫu nhiên 3: Giá trị ngoài phạm vi!'),
  new SyntaxError('Lỗi ngẫu nhiên 4: Cú pháp không hợp lệ!'),
  new ReferenceError('Lỗi ngẫu nhiên 5: Biến không tồn tại!'),
];

interface ExperimentalProviderProps {
  children: ReactNode;
}

export const ExperimentalProvider: React.FC<ExperimentalProviderProps> = ({
  children,
}) => {
  const [isExperimentalMode, setIsExperimentalMode] = useState(true);
  const [error, setError] = useState<Error | null>(null); // State để lưu lỗi

  const toggleExperimentalMode = () => {
    setIsExperimentalMode((prev) => !prev);
  };

  const throwRandomError = () => {
    const randomError = errors[Math.floor(Math.random() * errors.length)];
    setError(randomError);
  };

  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if (isExperimentalMode && event.shiftKey && event.key === 'T') {
        throwRandomError();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isExperimentalMode]);

  if (error) {
    throw error;
  }

  return (
    <ExperimentalContext.Provider
      value={{ isExperimentalMode, toggleExperimentalMode, throwRandomError }}
    >
      {children}
    </ExperimentalContext.Provider>
  );
};

export const useExperimental = () => {
  const context = useContext(ExperimentalContext);
  if (!context) {
    throw new Error(
      'useExperimental must be used within an ExperimentalProvider'
    );
  }
  return context;
};
