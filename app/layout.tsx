import type { Metadata } from 'next';
import './globals.css';
export const metadata: Metadata = {title:'Hikmah | حكمة',description:'A little wisdom, every day. Play Missing Letters, Multiple Choice and Cryptogram in Arabic or English, solo or with friends.',icons:{icon:'/favicon.png',shortcut:'/favicon.png'}};
export default function RootLayout({children}:{children:React.ReactNode}){return <html lang="en" suppressHydrationWarning><body>{children}</body></html>}
