import {
  BellRing,
  ChartNoAxesColumnIncreasing,
  Clock3,
  ListTodo,
  Plug,
  Users,
} from "lucide-react";

const features = [
  {
    icon: ListTodo,
    title: "Task Management",
    text: "Create, assign, and prioritize tasks in seconds. Keep your projects organized from start to finish.",
  },
  {
    icon: Users,
    title: "Team Collaboration",
    text: "Chat, share files, and brainstorm with your team. Work together in real time, no matter where you are.",
  },
  {
    icon: Clock3,
    title: "Project Timeline",
    text: "Track every milestone with Gantt & Kanban views. Stay on schedule and deliver projects on time.",
  },
  {
    icon: Plug,
    title: "Integrations",
    text: "Seamlessly connect with your favorite tools. From Slack to Google Calendar, we’ve got you covered.",
  },
  {
    icon: ChartNoAxesColumnIncreasing,
    title: "Reports & Analytics",
    text: "Gain valuable insights into your team’s performance. Make data-driven decisions with ease.",
    active: true,
  },
  {
    icon: BellRing,
    title: "Notifications & Reminders",
    text: "Never miss an update or deadline again. Stay focused with smart reminders and alerts.",
  },
];

export default function FeaturesSection() {
  return (
    <section
      id="features"
      className="bg-white px-6 py-24 text-[#111]"
    >

      <div className="mx-auto max-w-[1180px]">


        {/* Trusted Row */}
       





        {/* Feature Showcase */}

        <div className="
        relative
        overflow-hidden
        rounded-[32px]
        border
        border-black/10
        bg-white
        min-h-[520px]
        flex
        items-center
        ">


          {/* Left Content */}

          <div className="
          relative
          z-10
          w-full
          md:w-[50%]
          px-8
          py-14
          md:px-12
          ">


            <span className="
            inline-flex
            rounded-full
            border
            border-black/10
            px-4
            py-1.5
            text-xs
            tracking-widest
            text-black/60
            ">
              FEATURES
            </span>



            <h2 className="
            mt-6
            text-[38px]
            font-semibold
            leading-[1.1]
            tracking-[-0.05em]
            md:text-[48px]
            ">
              Effortless Project Tracking
            </h2>



            <p className="
            mt-5
            max-w-[420px]
            text-[17px]
            leading-relaxed
            text-black/60
            ">
              Monitor project progress in real time with customizable
              dashboards that keep your team aligned and projects on
              track, effortlessly.
            </p>




            {/* Points */}

            <div className="
            relative
            mt-10
            space-y-5
            pl-8
            ">


              <div className="
              absolute
              left-0
              top-0
              h-full
              w-[1px]
              bg-black/10
              "></div>



              <div className="relative">
                <span className="
                absolute
                -left-[32px]
                top-3
                h-[1px]
                w-6
                bg-black/10
                "></span>

                Customizable Dashboards
              </div>



              <div className="relative">

                <span className="
                absolute
                -left-[32px]
                top-3
                h-[1px]
                w-6
                bg-black/10
                "></span>

                Seamless Integration

              </div>


            </div>


          </div>






          {/* Dashboard Image */}

          <div className="
          absolute
          right-[-120px]
          top-1/2
          hidden
          -translate-y-1/2
          md:block
          w-[650px]
          ">


            <div className="
            rounded-[25px]
            border
            border-black/10
            bg-white
            shadow-[0_30px_80px_rgba(0,0,0,.12)]
            overflow-hidden
            ">


              <img
                src="https://cdn.shopify.com/s/files/1/0732/4496/7128/files/Screenshot_1448-02-01_at_10.46.59_PM.png?v=1784138544"
                alt="Omniwork Dashboard"
                className="w-full"
              />


            </div>


          </div>




        </div>

{/* Second Feature Showcase */}

<div className="
relative
mt-24
overflow-hidden
rounded-[32px]
border
border-black/10
bg-white
min-h-[520px]
flex
items-center
">


  {/* Left Dashboard Image */}

  <div className="
  absolute
  left-[-80px]
  top-1/2
  hidden
  -translate-y-1/2
  md:block
  w-[560px]
  ">


    <div className="
    rounded-[28px]
    border
    border-black/10
    bg-white
    overflow-hidden
    shadow-[0_30px_80px_rgba(0,0,0,.12)]
    ">

      <img
        src="https://cdn.shopify.com/s/files/1/0732/4496/7128/files/Screenshot_1448-02-01_at_11.13.46_PM.png?v=1784139283"
        alt="Omniwork Team Dashboard"
        className="w-full"
      />

    </div>


  </div>




  {/* Right Content */}

  <div className="
  relative
  z-10
  ml-auto
  w-full
  md:w-[50%]
  px-8
  py-14
  md:px-12
  ">


    <span className="
    inline-flex
    rounded-full
    border
    border-black/10
    px-4
    py-1.5
    text-xs
    tracking-widest
    text-black/60
    ">
      TEAM WORK
    </span>



    <h2 className="
    mt-6
    text-[38px]
    font-semibold
    leading-[1.1]
    tracking-[-0.05em]
    md:text-[48px]
    ">
      Team Collaboration
    </h2>



    <p className="
    mt-5
    max-w-[430px]
    text-[17px]
    leading-relaxed
    text-black/60
    ">
      Keep your team on the same page with real-time updates
      and intuitive project tracking. Ensure everyone stays aligned
      with minimal effort—customizable dashboards make it easy.
    </p>





    {/* Points */}

    <div className="
    relative
    mt-10
    space-y-5
    pl-8
    ">


      <div className="
      absolute
      left-0
      top-0
      h-full
      w-[1px]
      bg-black/10
      "></div>




      <div className="relative">

        <span className="
        absolute
        -left-[32px]
        top-3
        h-[1px]
        w-6
        bg-black/10
        "></span>

        Tailored Team Dashboards

      </div>




      <div className="relative">

        <span className="
        absolute
        -left-[32px]
        top-3
        h-[1px]
        w-6
        bg-black/10
        "></span>

        Real-Time Team Updates

      </div>



    </div>


  </div>



</div>


      </div>

    </section>
  );
}