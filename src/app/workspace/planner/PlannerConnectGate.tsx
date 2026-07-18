'use client';

import React, { useState } from 'react';
import { ChevronLeft, ChevronRight, Sparkles } from 'lucide-react';
import { toast } from 'sonner';
import styles from './PlannerConnectGate.module.css';

function GoogleIcon() {
  return (
    <span className={styles.googleIcon} aria-hidden="true">
      <span className={styles.googleBlue}>G</span>
    </span>
  );
}

function OutlookIcon() {
  return (
    <span className={styles.outlookIcon} aria-hidden="true">
      <span className={styles.outlookTile}>O</span>
      <span className={styles.outlookPage} />
    </span>
  );
}

const slides = [
  {
    title: 'Time blocking',
    description: 'Turn tasks into focused calendar blocks and keep every priority moving.',
  },
  {
    title: 'Team scheduling',
    description: 'See your team, find shared free time, and schedule a call in seconds.',
  },
  {
    title: 'Automatic time blocking',
    description: 'AI suggests and schedules tasks on your calendar. Like your own personal assistant.',
  },
];

function MiniAvatar({ className, face }: { className: string; face: string }) {
  return <span className={`${styles.avatar} ${className}`}>{face}</span>;
}

function BlueCalendarCard() {
  return (
    <article className={`${styles.featureCard} ${styles.blueCard}`} aria-hidden="true">
      <div className={styles.blueCalendar}>
        <div className={styles.blueCalendarTabs}>
          <span>Task planning</span>
          <strong>Schedule meeting</strong>
        </div>
        <div className={styles.blueGrid}>
          <div className={styles.bookMeeting}>Book Meeting</div>
          <div className={`${styles.blueEvent} ${styles.blueEventOne}`}>
            <b>Design Review</b><small>1 - 2pm</small>
          </div>
          <div className={`${styles.blueEvent} ${styles.blueEventTwo}`}>Inbox <span>2:30pm</span></div>
          <div className={`${styles.blueEvent} ${styles.blueEventThree}`}>Calendar <b>Squad Sync</b></div>
        </div>
        <div className={styles.peopleBar}>
          <MiniAvatar className={styles.faceOne} face="👨🏻" />
          <MiniAvatar className={styles.faceTwo} face="👩🏾" />
          <MiniAvatar className={styles.faceThree} face="👩🏻" />
          <MiniAvatar className={styles.faceFour} face="👨🏼" />
        </div>
      </div>
      <div className={styles.cardCopy}>
        <h3>Team scheduling</h3>
        <p>See who is free in your team, find shared time, and schedule a call.</p>
      </div>
    </article>
  );
}

function TaskPill({ children, short = false }: { children: React.ReactNode; short?: boolean }) {
  return (
    <div className={`${styles.taskPill} ${short ? styles.taskPillShort : ''}`}>
      <Sparkles size={14} strokeWidth={2.8} />
      <b>{children}</b>
    </div>
  );
}

function PurpleCalendarCard({ slide }: { slide: (typeof slides)[number] }) {
  return (
    <article className={`${styles.featureCard} ${styles.purpleCard}`}>
      <div className={styles.purpleCalendar} aria-hidden="true">
        <div className={styles.taskSummary}>
          <span className={styles.rowNumber}>1</span>
          <div>
            <strong><i />Update color tokens</strong>
            <p><span>▣ 17 Mar</span><span>⌛ 4h</span><b>ϟ 4 sessions</b></p>
          </div>
        </div>
        <div className={styles.scheduleGrid}>
          <div className={`${styles.purpleEvent} ${styles.feedback}`}>
            <b>Design Sprint Feedback</b><span>12 - 1pm</span>
          </div>
          <div className={styles.slot}><TaskPill>Update color tokens</TaskPill><span>2 - 3pm</span><small>¾</small></div>
          <div className={styles.slot}><TaskPill short>Update color tokens</TaskPill><small>¼</small></div>
          <div className={`${styles.purpleEvent} ${styles.review}`}><b>Design Review</b><span>1 - 2pm</span></div>
          <div className={`${styles.purpleEvent} ${styles.lunch}`}><b>Team Lunch</b><span>1:30pm</span></div>
          <div className={styles.slot}><TaskPill>Update color tokens</TaskPill><span>2 - 3pm</span><small>²⁄₄</small></div>
          <div className={styles.stackSlot}>
            <TaskPill short>Update color tokens</TaskPill>
            <div className={styles.squadSync}>Calendar Squad Sync</div>
          </div>
        </div>
      </div>
      <div className={styles.cardCopy}>
        <h3>{slide.title}</h3>
        <p>{slide.description}</p>
      </div>
    </article>
  );
}

export default function PlannerConnectGate({ isOwner }: { isOwner: boolean }) {
  const [index, setIndex] = useState(2);
  const slide = slides[index];

  const connectGoogle = (event: React.MouseEvent) => {
    if (!isOwner) {
      event.preventDefault();
      toast.info('Only the workspace owner can connect Google Calendar.');
    }
  };

  return (
    <section className={styles.plannerGate}>
      <div className={styles.paperGrid} aria-hidden="true" />

      <div className={styles.hero}>
        <h1>You, but better<br />organized</h1>
        <p>
          Connect your calendar to manage events, time<br className={styles.desktopBreak} />
          block your work, and take meeting notes -<br className={styles.desktopBreak} />
          powered by OmniWork AI.
        </p>
      </div>

      <div className={styles.connectionArea}>
        <span>Get started with</span>
        <div className={styles.connectionButtons}>
          <a href="/api/integrations/google/connect" onClick={connectGoogle}>
            <GoogleIcon /> Google Calendar
          </a>
          <button type="button" onClick={() => toast.info('Microsoft Outlook integration is coming soon.')}>
            <OutlookIcon /> Microsoft Outlook
          </button>
        </div>
        {!isOwner && <small>Your workspace owner needs to connect a calendar.</small>}
      </div>

      <div className={styles.cardsScene}>
        <BlueCalendarCard />
        <PurpleCalendarCard slide={slide} />
      </div>

      <div className={styles.carouselControls}>
        <button
          type="button"
          onClick={() => setIndex((current) => (current - 1 + slides.length) % slides.length)}
          aria-label="Previous planner feature"
        >
          <ChevronLeft />
        </button>
        <button
          type="button"
          onClick={() => setIndex((current) => (current + 1) % slides.length)}
          aria-label="Next planner feature"
        >
          <ChevronRight />
        </button>
      </div>
    </section>
  );
}
