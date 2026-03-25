export default function Layout({ children }) {
  return (
    <div style={{ fontFamily: "'DM Sans', sans-serif" }}>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=DM+Sans:ital,opsz,wght@0,9..40,300..800;1,9..40,300..800&display=swap');
        * { box-sizing: border-box; }
        body { margin: 0; }
      `}</style>
      {children}
    </div>
  );
}
