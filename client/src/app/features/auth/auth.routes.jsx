import LoginLayout from './login/LoginLayout/LoginLayout';

export default {
    publicRoutes: [
        {
            path: 'login',
            element: <LoginLayout />,
        },
        {
            path: 'reset-password',
            element: <LoginLayout />,
        },
        {
            path: 'recover-account',
            element: <LoginLayout />,
        },
    ],
};
