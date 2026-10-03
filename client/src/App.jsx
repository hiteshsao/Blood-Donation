import React from 'react';
import { BrowserRouter } from 'react-router-dom';
import { Toaster } from 'react-hot-toast';
import { AuthProvider } from './context/AuthContext';
import { SocketProvider } from './context/SocketContext';
import { NotificationProvider } from './context/NotificationContext';
import { AppRoutes } from './routes/AppRoutes';

export default function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <SocketProvider>
          <NotificationProvider>
            {/* Global Styled Toaster Notification Mount */}
            <Toaster
              position="top-right"
              toastOptions={{
                duration: 4000,
                style: {
                  background: '#FFFFFF',
                  color: '#0F172A',
                  border: '1px solid #FFE4E4',
                  borderRadius: '16px',
                  boxShadow: '0 10px 30px -4px rgba(198, 40, 40, 0.12), 0 4px 12px -2px rgba(0, 0, 0, 0.05)',
                  fontSize: '13px',
                  fontWeight: 600,
                  padding: '12px 18px',
                },
                success: {
                  iconTheme: {
                    primary: '#C62828',
                    secondary: '#FFFFFF',
                  },
                },
                error: {
                  iconTheme: {
                    primary: '#DC2626',
                    secondary: '#FFFFFF',
                  },
                },
              }}
            />

            {/* Application Routing Canvas */}
            <AppRoutes />
          </NotificationProvider>
        </SocketProvider>
      </AuthProvider>
    </BrowserRouter>
  );
}
