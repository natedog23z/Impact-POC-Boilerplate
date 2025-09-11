import "@radix-ui/themes/styles.css";
import "../styles/fonts.css";
import { AuthProvider } from "@/components/AuthProvider";
import { LayoutContent } from "@/components/LayoutContent";
import { ThemeProvider } from "@/components/ThemeProvider";
import { ToastProvider } from "@/components/ToastProvider";

export const metadata = {
  title: 'Gloo Impact',
  description: 'Maximizing Philanthropy with Precision & Transparency',
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="en" suppressHydrationWarning>
      <head>
        <link rel="icon" href="/favicon.ico" sizes="any" />
        <style>{`
          .nav-item:hover {
            background-color: var(--gray-4) !important;
          }
          .grid-cards-container {
            display: grid;
            gap: 20px;
            grid-template-columns: repeat(auto-fit, minmax(250px, 1fr));
          }
          @media (min-width: 1200px) {
            .grid-cards-container {
              grid-template-columns: repeat(4, 1fr);
            }
          }
          @media (max-width: 768px) {
            .grid-cards-container {
              grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
            }
          }
          .grid-card {
            box-shadow: none !important;
          }
          .grid-card:hover {
            transform: translateY(-2px) !important;
            box-shadow: var(--shadow-4) !important;
          }
          
          /* Dark mode optimizations */
          @media (prefers-color-scheme: dark) {
            .grid-card:hover {
              box-shadow: 0 4px 12px rgba(0,0,0,0.3) !important;
            }
          }

          /* Let Radix UI handle body background and text colors */
        `}</style>
      </head>
      <body>
        <ThemeProvider>
          <ToastProvider>
            <AuthProvider>
              <LayoutContent>
                {children}
              </LayoutContent>
            </AuthProvider>
          </ToastProvider>
        </ThemeProvider>
      </body>
    </html>
  )
}
