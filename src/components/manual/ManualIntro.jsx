import { motion } from "framer-motion";
import { BookOpen, Target, Users, Zap } from "lucide-react";

export default function ManualIntro() {
  const highlights = [
    {
      icon: Target,
      title: "Purpose-Driven",
      text: "Transform raw ATM maintenance logs into actionable operational intelligence",
    },
    {
      icon: Zap,
      title: "AI-Powered",
      text: "Automated extraction of maintenance data from Excel spreadsheets",
    },
    {
      icon: Users,
      title: "For Operations Teams",
      text: "Built for ATM maintenance teams, branch managers, and field technicians",
    },
  ];

  return (
    <motion.section
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="bg-gradient-to-br from-indigo-600 to-indigo-800 rounded-3xl p-10 text-white shadow-lg"
    >
      <div className="flex items-center gap-3 mb-6">
        <div className="w-12 h-12 bg-white/20 rounded-xl flex items-center justify-center backdrop-blur-sm">
          <BookOpen className="w-6 h-6 text-white" />
        </div>
        <div>
          <h2 className="text-2xl font-bold">Application Manual</h2>
          <p className="text-indigo-200 text-sm">Complete guide to the ATM Tracker platform</p>
        </div>
      </div>

      <p className="text-indigo-100 leading-relaxed mb-8 max-w-3xl">
        The <strong>ATM Tracker</strong> is a centralized maintenance analytics platform designed to help
        banks and ATM service providers monitor, track, and resolve ATM faults efficiently.
        It ingests raw maintenance log data from Excel files, leverages AI to automatically
        structure it, and presents real-time dashboards so teams can identify recurring issues,
        track resolution performance, and reduce ATM downtime.
      </p>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {highlights.map((item, i) => {
          const Icon = item.icon;
          return (
            <div
              key={i}
              className="bg-white/10 backdrop-blur-sm rounded-2xl p-5 border border-white/10"
            >
              <Icon className="w-6 h-6 text-indigo-200 mb-3" />
              <h3 className="font-semibold text-white mb-1">{item.title}</h3>
              <p className="text-sm text-indigo-100">{item.text}</p>
            </div>
          );
        })}
      </div>
    </motion.section>
  );
}