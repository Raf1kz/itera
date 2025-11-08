import { Brain, Sparkles, TrendingUp, Zap } from 'lucide-react';
import { Button } from './ui/button';
import { motion } from 'motion/react';

interface WelcomeHeroProps {
  onGetStarted: () => void;
}

export function WelcomeHero({ onGetStarted }: WelcomeHeroProps) {
  return (
    <div className="min-h-screen bg-gradient-to-br from-neutral-50 via-stone-50 to-neutral-100 flex items-center justify-center p-8 overflow-hidden relative">
      {/* Animated background elements */}
      <div className="absolute inset-0 overflow-hidden">
        <motion.div
          className="absolute top-20 left-20 w-72 h-72 bg-blue-500/5 rounded-full blur-3xl"
          animate={{
            x: [0, 100, 0],
            y: [0, 50, 0],
          }}
          transition={{
            duration: 20,
            repeat: Infinity,
            ease: "linear"
          }}
        />
        <motion.div
          className="absolute bottom-20 right-20 w-96 h-96 bg-purple-500/5 rounded-full blur-3xl"
          animate={{
            x: [0, -100, 0],
            y: [0, -50, 0],
          }}
          transition={{
            duration: 25,
            repeat: Infinity,
            ease: "linear"
          }}
        />
      </div>

      <div className="max-w-6xl mx-auto relative z-10">
        <div className="text-center mb-16">
          {/* Logo */}
          <motion.div
            initial={{ scale: 0, rotate: -180 }}
            animate={{ scale: 1, rotate: 0 }}
            transition={{ 
              type: "spring", 
              stiffness: 200, 
              damping: 20,
              duration: 0.8 
            }}
            className="inline-flex items-center justify-center mb-8"
          >
            <div className="relative">
              <div className="w-24 h-24 bg-gradient-to-br from-neutral-900 to-neutral-700 rounded-3xl flex items-center justify-center shadow-2xl">
                <Brain className="w-12 h-12 text-white" />
              </div>
              <motion.div
                className="absolute -top-2 -right-2 w-8 h-8 bg-gradient-to-br from-yellow-400 to-orange-500 rounded-full flex items-center justify-center shadow-lg"
                animate={{
                  rotate: [0, 360],
                }}
                transition={{
                  duration: 3,
                  repeat: Infinity,
                  ease: "linear"
                }}
              >
                <Sparkles className="w-4 h-4 text-white" />
              </motion.div>
            </div>
          </motion.div>

          {/* Headline */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.3, duration: 0.6 }}
          >
            <h1 className="text-6xl mb-6 text-neutral-900 tracking-tight">
              Learn Smarter with <span className="bg-gradient-to-r from-neutral-900 to-neutral-600 bg-clip-text text-transparent">AI</span>
            </h1>
            <p className="text-xl text-neutral-600 max-w-2xl mx-auto leading-relaxed">
              Transform your notes into powerful flashcards and summaries. 
              Study smarter, remember longer, achieve more.
            </p>
          </motion.div>

          {/* CTA */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.5, duration: 0.6 }}
            className="mt-10"
          >
            <motion.div whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }}>
              <Button
                onClick={onGetStarted}
                className="h-14 px-8 bg-neutral-900 hover:bg-neutral-800 text-lg shadow-2xl hover:shadow-xl transition-all group relative overflow-hidden"
              >
                <span className="relative z-10 flex items-center">
                  Get Started Free
                  <motion.span
                    className="ml-2"
                    animate={{ x: [0, 4, 0] }}
                    transition={{ duration: 1.5, repeat: Infinity }}
                  >
                    →
                  </motion.span>
                </span>
                <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/10 to-transparent translate-x-[-100%] group-hover:translate-x-[100%] transition-transform duration-700" />
              </Button>
            </motion.div>
            <p className="text-sm text-neutral-500 mt-4">No credit card required • Free forever</p>
          </motion.div>
        </div>

        {/* Feature Cards */}
        <motion.div
          initial={{ opacity: 0, y: 40 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.7, duration: 0.8 }}
          className="grid grid-cols-1 md:grid-cols-3 gap-6 max-w-4xl mx-auto"
        >
          {[
            {
              icon: <Sparkles className="w-6 h-6" />,
              title: "AI-Powered",
              description: "Generate flashcards and summaries instantly",
              gradient: "from-blue-500 to-cyan-500"
            },
            {
              icon: <TrendingUp className="w-6 h-6" />,
              title: "Track Progress",
              description: "Build streaks and master your subjects",
              gradient: "from-purple-500 to-pink-500"
            },
            {
              icon: <Zap className="w-6 h-6" />,
              title: "Study Faster",
              description: "Learn more efficiently with smart repetition",
              gradient: "from-orange-500 to-red-500"
            }
          ].map((feature, index) => (
            <motion.div
              key={index}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.9 + index * 0.1 }}
              whileHover={{ y: -4, scale: 1.02 }}
              className="bg-white/80 backdrop-blur-sm border border-neutral-200 rounded-2xl p-6 shadow-lg hover:shadow-xl transition-all"
            >
              <div className={`w-12 h-12 bg-gradient-to-br ${feature.gradient} rounded-xl flex items-center justify-center mb-4 text-white shadow-lg`}>
                {feature.icon}
              </div>
              <h3 className="text-neutral-900 mb-2">{feature.title}</h3>
              <p className="text-sm text-neutral-600 leading-relaxed">
                {feature.description}
              </p>
            </motion.div>
          ))}
        </motion.div>

        {/* Social Proof */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 1.2, duration: 0.6 }}
          className="mt-16 text-center"
        >
          <p className="text-sm text-neutral-500 mb-4">Trusted by students worldwide</p>
          <div className="flex items-center justify-center gap-8 text-neutral-400">
            <div className="flex items-center gap-2">
              <div className="flex -space-x-2">
                {[1, 2, 3, 4].map((i) => (
                  <div key={i} className="w-8 h-8 bg-gradient-to-br from-neutral-300 to-neutral-400 rounded-full border-2 border-white" />
                ))}
              </div>
              <span className="text-sm">10,000+ students</span>
            </div>
            <div className="flex items-center gap-1">
              <span className="text-yellow-500">★★★★★</span>
              <span className="text-sm ml-1">4.9/5</span>
            </div>
          </div>
        </motion.div>
      </div>
    </div>
  );
}
