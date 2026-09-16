import { createContext, useContext, type ReactNode } from 'react';

import type { CoreApplication } from '@/infrastructure/application/create-core-application';

const ApplicationContext = createContext<CoreApplication | null>(null);

type ApplicationContextProviderProps = {
  application: CoreApplication;
  children: ReactNode;
};

export function ApplicationContextProvider({
  application,
  children,
}: ApplicationContextProviderProps) {
  return (
    <ApplicationContext.Provider value={application}>
      {children}
    </ApplicationContext.Provider>
  );
}

export function useApplication(): CoreApplication {
  const application = useContext(ApplicationContext);

  if (!application) {
    throw new Error('Application services are not available in this component tree.');
  }

  return application;
}
