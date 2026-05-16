import { Cpu, Radar, MapPin, LayoutDashboard, Users, Activity, Calendar, Shield, Globe } from "lucide-react";

export default function LandingPage() {
  return (
    <div className="min-h-screen bg-white font-sans">

      {/* NAVBAR */}
      <header className="fixed top-0 left-0 w-full bg-white/80 backdrop-blur-md border-b border-gray-200 z-50">
        <nav className="max-w-7xl mx-auto flex items-center justify-between px-6 py-4">
          <h1 className="text-xl font-extrabold text-[#0040a1] tracking-tight">Kinetic Fleet</h1>
          <div className="flex items-center gap-4">
            <a href="/login" className="text-gray-600 hover:text-[#0040a1] text-sm font-medium">Login</a>
            <button className="bg-[#0040a1] text-white px-4 py-2 rounded-lg hover:bg-[#043277] transition text-sm font-semibold">
              Request Demo
            </button>
          </div>
        </nav>
      </header>

      <main>

        {/* HERO */}
        <section className="min-h-screen flex items-center bg-white pt-20">
          <div className="max-w-7xl mx-auto px-6 grid md:grid-cols-2 gap-18 items-center w-full">

            {/* LEFT */}
            <div>
              <span className="text-xs bg-gray-200 px-3 py-1 rounded-full text-gray-600 font-semibold uppercase tracking-widest">
                Next-Gen Transit IoT
              </span>
              <h1 className="text-5xl md:text-6xl font-extrabold text-[#0040a1] mt-4 leading-tight tracking-tight">
                Smart Bus <br />Monitoring in Real-Time
              </h1>
              <p className="text-gray-500 mt-4 max-w-md text-base leading-relaxed">
                Monitor passenger capacity and bus location using cutting-edge IoT
                technology for seamless transit management. Precision tracking
                meets operational excellence.
              </p>
              <button className="mt-6 bg-[#0040a1] text-white px-8 py-4 rounded-xl hover:bg-[#043277] transition text-base font-bold shadow-lg shadow-blue-200">
                Login →
              </button>
            </div>

            {/* RIGHT */}
            <div className="relative">
              <div className="relative">
                <img
                  src="/landingpage.png"
                  alt="Bus"
                  className="w-full max-w-xl h-[420px] object-cover rounded-2xl shadow-2xl shadow-blue-100"
                />
                {/* Floating Card */}
                <div className="absolute -left-2 -bottom-2 bg-white p-5 rounded-xl shadow-xl border border-gray-100 w-56 z-20">
                  <p className="text-xs text-gray-400 uppercase tracking-widest font-bold">Live Updates</p>
                  <h2 className="text-3xl font-extrabold text-[#0040a1] mt-1 leading-tight">98.4%</h2>
                  <p className="text-xs text-gray-400 mt-1 font-medium">Fleet Accuracy Today</p>
                </div>
              </div>
            </div>

          </div>
        </section>

        {/* FOUNDATIONS */}
        <section className="py-32 bg-linear-to-r from-[#f9f9ff] to-[#eef3ff] mt-8">
          <div className="max-w-7xl mx-auto px-8">
            <div className="grid md:grid-cols-2 gap-12 items-center">

              <div className="max-w-lg">
                <h2 className="text-3xl font-extrabold text-[#0040a1] mb-6 tracking-tight">
                  Foundations of Precision
                </h2>
                <p className="text-gray-500 leading-relaxed text-base">
                  Kinetic Fleet is an advanced IoT solution leveraging ESP32,
                  infrared sensors, and RFID technology to provide real-time
                  monitoring and operational efficiency for modern transportation.
                  We bridge the gap between physical movement and digital intelligence.
                </p>
              </div>

              <div className="grid sm:grid-cols-2 gap-6">
                <div className="bg-white p-8 rounded-2xl shadow-lg hover:shadow-xl transition-all duration-300 hover:-translate-y-2">
                  <div className="flex items-start justify-start mb-4">
                    <Cpu className="w-8 h-8 text-[#0040a1]" />
                  </div>
                  <h3 className="font-bold text-gray-800 mb-2">ESP32 Core</h3>
                  <p className="text-gray-500 text-sm leading-relaxed">High-speed data processing at the edge.</p>
                </div>
                <div className="bg-white p-8 rounded-2xl shadow-lg hover:shadow-xl transition-all duration-300 hover:-translate-y-2">
                  <div className="flex items-start justify-start mb-4">
                    <Radar className="w-8 h-8 text-[#0040a1]" />
                  </div>
                  <h3 className="font-bold text-gray-800 mb-2">IR Detection</h3>
                  <p className="text-gray-500 text-sm leading-relaxed">Non-intrusive passenger counting sensors.</p>
                </div>
              </div>

            </div>
          </div>
        </section>

        {/* ARCHITECTURE */}
        <section className="max-w-7xl mx-auto px-8 py-20">
            <h2 className="text-3xl font-extrabold text-[#0040a1] mb-2 tracking-tight">
                Architecture of Efficiency
            </h2>
            <div className="w-12 h-1 bg-[#0040a1] mb-10 rounded-full" />

            <div className="grid grid-cols-3 grid-rows-2 gap-4 h-auto">

                {/* Card 1 - Real-Time Passenger Counting  */}
                <div className="col-span-2 bg-linear-to-r from-[#f9f9ff] to-[#eef3ff] p-7 rounded-2xl border border-gray-200 hover:shadow-md transition">
                    <Users className="w-8 h-8 text-[#0040a1] mb-4" />
                    <h3 className="font-bold text-gray-900 text-lg mb-2">Real-Time Passenger Counting</h3>
                    <p className="text-sm text-gray-500 leading-relaxed max-w-sm">
                        Uses infrared sensors at bus doors to track occupancy precisely, ensuring data integrity for every entry and exit.
                    </p>
                </div>

                {/* Card 2 - Smart Capacity */}
                <div className="col-span-1 bg-linear-to-r from-[#f9f9ff] to-[#eef3ff] p-7 rounded-2xl border border-blue-100 hover:shadow-md transition">
                    <Activity className="w-8 h-8 text-[#0040a1] mb-4" />
                    <h3 className="font-bold text-gray-900 text-lg mb-2">Smart Capacity</h3>
                    <p className="text-sm text-gray-500 leading-relaxed">
                        Instant visibility into bus fullness and seat availability across the entire fleet network.
                    </p>
                </div>

                {/* Card 3 - RFID Bus Tracking */}
                <div className="col-span-1 bg-[#0040a1] p-7 rounded-2xl shadow-md">
                    <MapPin className="w-8 h-8 text-blue-200 mb-12" />
                    <h3 className="font-bold text-white text-lg mb-2">RFID-Based Bus Tracking</h3>
                    <p className="text-sm text-blue-200 leading-relaxed">
                        Reliable location tracking at every stop without the need for GPS, utilizing robust local identification systems.
                    </p>
                </div>

                {/* Card 4 - Live Dashboard */}
                <div className="col-span-2 bg-linear-to-r from-[#f9f9ff] to-[#eef3ff] p-7 rounded-2xl border border-blue-100 hover:shadow-md transition">
                    <div className="flex items-start justify-between mb-3">
                        <h3 className="font-bold text-gray-900 text-lg">Live Dashboard</h3>
                        <LayoutDashboard className="w-8 h-8 text-[#0040a1]" />
                    </div>
                        <p className="text-sm text-gray-500 leading-relaxed max-w-xs">
                            Web-based control center for capacity, location, and stop status. Command and control from any device.
                        </p>
                    <div className="flex gap-8 mt-6">
                        <div>
                            <p className="text-xs text-gray-400 uppercase tracking-widest font-semibold mb-1">Update Rate</p>
                            <p className="text-lg font-bold text-gray-800">250ms</p>
                        </div>
                        <div>
                            <p className="text-xs text-gray-400 uppercase tracking-widest font-semibold mb-1">Latency</p>
                            <p className="text-lg font-bold text-gray-800">&lt; 0.1s</p>
                        </div>
                    </div>
                </div>
            </div>
        </section>

        {/* {/* DATA JOURNEY */}
        <section className="py-20 bg-linear-to-r from-[#f9f9ff] to-[#eef3ff] ">
            <h2 className="text-center text-[#0040a1] text-3xl font-extrabold tracking-widest uppercase mb-16">
                The Data Journey
            </h2>

            <div className="relative max-w-3xl mx-auto">

                {/* Garis vertikal tengah */}
                <div className="absolute left-1/2 -translate-x-1/2 top-0 bottom-0 w-px bg-blue-200" />

                {[
                { n: 1, title: "Step 1: Detection",      desc: "Advanced IR sensors detect passenger movement at entry and exit points in real-time.",                          side: "left"  },
                { n: 2, title: "Step 2: Processing",     desc: "Embedded ESP32 microcontrollers process raw sensor data into structured transit metrics.",                     side: "right" },
                { n: 3, title: "Step 3: Identification", desc: "RFID proximity tags identify the bus at specific route checkpoints with absolute precision.",                  side: "left"  },
                { n: 4, title: "Step 4: Transmission",   desc: "Secure data packets are uploaded to the cloud via cellular or dedicated transit mesh networks.",               side: "right" },
                { n: 5, title: "Step 5: Visualization",  desc: "Control rooms gain instant insights via the Kinetic Live Dashboard for proactive fleet management.",           side: "left"  },
                ].map(({ n, title, desc, side }) => (
                <div key={n} className="relative flex items-center mb-12">

                    {/* Konten kiri */}
                    <div className={`w-1/2 pr-10 ${side === "left" ? "text-right" : ""}`}>
                    {side === "left" && (
                        <>
                        <h3 className="font-bold text-[#0040a1] text-lg mb-1">{title}</h3>
                        <p className="text-sm text-gray-500 leading-relaxed">{desc}</p>
                        </>
                    )}
                    </div>

                    {/* Nomor bulat di tengah */}
                    <div className="absolute left-1/2 -translate-x-1/2 w-10 h-10 bg-[#0040a1] text-white rounded-full flex items-center justify-center font-bold text-lg z-10 shadow-md">
                    {n}
                    </div>

                    {/* Konten kanan */}
                    <div className={`w-1/2 pl-10 ${side === "right" ? "text-left" : ""}`}>
                    {side === "right" && (
                        <>
                        <h3 className="font-bold text-[#0040a1] text-lg mb-1">{title}</h3>
                        <p className="text-sm text-gray-500 leading-relaxed">{desc}</p>
                        </>
                    )}
                    </div>

                </div>
                ))}
            </div>
        </section>

        {/* BENEFITS */}
        <section className="py-32 bg-white">
          <div className="max-w-7xl mx-auto px-6">
            <div className="grid md:grid-cols-3 gap-10 text-center">
              {[
                { icon: <Calendar className="w-8 h-8 text-[#0040a1]" />, title: "Efficient Trip Planning", desc: "Empower passengers with real-time occupancy data to choose the best times for travel." },
                { icon: <Shield className="w-8 h-8 text-[#0040a1]" />, title: "Improved Service Quality", desc: "Maintain high standards of safety and comfort by preventing overcrowding through data." },
                { icon: <Globe className="w-8 h-8 text-[#0040a1]" />, title: "Integrated Monitoring", desc: "A singular, unified source of truth for location, capacity, and operational status." },
              ].map(({ icon, title, desc }) => (
                <div key={title} className="flex flex-col items-center">
                  <div className="bg-linear-to-r from-[#f9f9ff] to-[#eef3ff] p-3 rounded-xl mb-4">{icon}</div>
                  <h3 className="font-bold text-gray-800 text-lg">{title}</h3>
                  <p className="text-sm text-gray-500 mt-2 max-w-xs leading-relaxed">{desc}</p>
                </div>
              ))}
            </div>
          </div>
        </section>

        <footer className="py-6 px-10 bg-linear-to-r from-[#f9f9ff] to-[#eef3ff]">
            <div className="max-w-7xl mx-auto flex items-center gap-12 ">
                <div className="text-[#0040a1] gap-24 font-bold txt-sm leading=tight min-w-fit mx-6">
                    Kinetic<br /> Fleet
                </div>

                <div className="flex items-center gap-24 flex-1 mx-12">
                    <span className="text-gray-500 text-xs font-semibold tracking-widest uppercase cursor-pointer hover:text-[#0040a1] transition leading-tight">
                        Privacy<br />Policy
                    </span>
                    <span className="text-gray-500 text-xs font-semibold tracking-widest uppercase cursor-pointer hover:text-[#0040a1] transition leading-tight">
                        Terms of<br />Service
                    </span>
                    <span className="text-gray-500 text-xs font-semibold tracking-widest uppercase cursor-pointer hover:text-[#0040a1] transition leading-tight">
                        Cookie<br />Settings
                    </span>
                    <span className="text-gray-500 text-xs font-semibold tracking-widest uppercase cursor-pointer hover:text-[#0040a1] transition leading-tight">
                        Contact<br />Support
                    </span>
                </div>

                {/* Copyright */}
                <div className="text-gray-400 text-sm tracking-wide uppercase text-right min-w-fit">
                © 2024 Kinetic Precision Framework. All Rights Reserved.
                </div>
            </div>
        </footer>
      </main>
    </div>
  );
}