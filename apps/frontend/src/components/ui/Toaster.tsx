'use client';

import { ToastContainer } from 'react-toastify';

export function Toaster() {
  return (
    <ToastContainer
      position="top-right"
      autoClose={4000}
      hideProgressBar={false}
      newestOnTop
      closeOnClick
      pauseOnFocusLoss={false}
      draggable
      pauseOnHover
      theme="light"
      toastClassName="!rounded-xl !shadow-xl !text-sm !font-medium"
    />
  );
}
