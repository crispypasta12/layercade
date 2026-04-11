const TEXT =
  'FREE DELIVERY OVER 1,000৳ IN DHAKA ◆ PREMIUM QUALITY 3D PRINTS ◆ CUSTOM ORDERS WELCOME ◆ SAME-WEEK TURNAROUND ◆ ';

export default function AnnouncementBar() {
  return (
    <div className="h-[36px] bg-[#ff5500] overflow-hidden flex items-center fixed top-0 w-full z-[110]">
      {/* Two identical spans — CSS marquee seamlessly loops */}
      <div className="animate-marquee whitespace-nowrap">
        <span className="font-technical text-black font-bold uppercase tracking-[0.15em] text-[0.65rem] px-4">
          {TEXT.repeat(2)}
        </span>
        <span className="font-technical text-black font-bold uppercase tracking-[0.15em] text-[0.65rem] px-4">
          {TEXT.repeat(2)}
        </span>
      </div>
    </div>
  );
}
