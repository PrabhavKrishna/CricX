'use client';

import { createContext, useContext } from 'react';

const SessionContext = createContext<any>(null);

export const SessionProvider = SessionContext.Provider;
export const useAppSession = () => useContext(SessionContext);
