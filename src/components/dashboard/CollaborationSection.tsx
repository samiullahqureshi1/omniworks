import {
  Check,
  BarChart3,
  Workflow,
  ShieldCheck,
} from "lucide-react";


const smallFeatures = [
  {
    icon: Check,
    title: "Smart Task Management",
    text: "Organize and prioritize tasks with our user-friendly task management system.",
  },
  {
    icon: BarChart3,
    title: "Eco-Friendly Analytics",
    text: "Track performance with powerful analytics and real-time insights.",
  },
  {
    icon: Workflow,
    title: "Customizable Workflows",
    text: "Create workflows that match your team's unique working style.",
  },
  {
    icon: ShieldCheck,
    title: "Secure and Scalable",
    text: "Enterprise-level security built for teams of every size.",
  },
];


export default function CollaborationSection() {
  return (
    <section
      id="about"
      className="bg-white px-6 py-24 text-[#111]"
    >

      <div className="mx-auto max-w-[1180px]">


        {/* Heading */}

        <div className="text-center">

          <h2 className="
          mx-auto
          max-w-[800px]
          text-[44px]
          font-semibold
          leading-[1.08]
          tracking-[-0.05em]
          md:text-[58px]
          ">
            Effortless Project Tracking
          </h2>


          <p className="
          mx-auto
          mt-5
          max-w-[650px]
          text-lg
          leading-relaxed
          text-black/60
          ">
            Easily monitor the progress of your projects with intuitive
            dashboards and real-time updates. Keep everyone aligned.
          </p>

        </div>





        {/* Feature Cards */}

        <div className="
        mt-14
        grid
        gap-6
        sm:grid-cols-2
        lg:grid-cols-4
        ">


          {smallFeatures.map((item)=>{

            const Icon=item.icon;

            return(

              <div
              key={item.title}
              className="
              rounded-[22px]
              border
              border-black/10
              bg-white
              p-5
              "
              >


                <div className="
                flex
                h-12
                w-12
                items-center
                justify-center
                rounded-xl
                bg-[#f3f3f1]
                ">

                  <Icon size={22} strokeWidth={1.8}/>

                </div>



                <h3 className="
                mt-8
                text-[18px]
                font-semibold
                tracking-[-0.03em]
                ">
                  {item.title}
                </h3>



                <p className="
                mt-3
                text-sm
                leading-relaxed
                text-black/55
                ">
                  {item.text}
                </p>


              </div>

            )

          })}


        </div>





        {/* Large Image */}

        <div className="
        mt-16
        overflow-hidden
        rounded-[36px]
        border
        border-black/10
        bg-[#f7f7f5]
        ">


          <img
            src="https://cdn.shopify.com/s/files/1/0732/4496/7128/files/Screenshot_1448-02-01_at_11.17.42_PM.png?v=1784139516"
            alt="Omniwork Workspace"
            className="
            w-full
            object-cover
            "
          />


        </div>



      </div>


    </section>
  );
}