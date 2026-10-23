'use client';

import { motion } from 'framer-motion';
import { ReactNode } from 'react';

interface PageTransitionProps {
    children: ReactNode;
    className?: string;
}

const variants = {
    hidden: { opacity: 0, y: 15 },
    enter: { opacity: 1, y: 0 },
    exit: { opacity: 0, y: -15 },
};

export default function PageTransition({ children, className }: PageTransitionProps) {
    return (
        <motion.div
            variants={variants}
            initial="hidden"
            animate="enter"
            exit="exit"
            transition={{ type: 'tween', ease: 'easeOut', duration: 0.3 }}
            className={className}
        >
            {children}
        </motion.div>
    );
}
