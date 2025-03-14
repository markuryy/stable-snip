import Link from "next/link";

export function Footer() {
  return (
    <footer className="mt-auto pt-8 pb-4 flex justify-center">
      <div className="w-full px-20 py-2 flex items-center justify-between text-xs">
        <div className="hidden lg:block">
          <span className="opacity-50">
        Use responsibly; avoid misleading others.
      </span>
    </div>
    <Link
      href={"https://markury.dev"}
      target="_blank"
      className="opacity-50 hover:opacity-100 transition-opacity duration-200"
    >
      A Markury Project
    </Link>
  </div>
    </footer>
  );
}