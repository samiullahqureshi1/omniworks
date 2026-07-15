import { Check, X } from "lucide-react";

const plans = [
  {
    name: "Starter",
    tag: "For individuals",
    price: "$4",
    features: [
      ["Task Management", true],
      ["Real-time Collaboration", true],
      ["Customizable Dashboards", true],
      ["Advanced Analytics", false],
      ["Resource Allocation", false],
      ["Mobile Accessibility", false],
    ],
  },

  {
    name: "Pro",
    tag: "For startups",
    price: "$10",
    popular: true,
    features: [
      ["Task Management", true],
      ["Real-time Collaboration", true],
      ["Customizable Dashboards", true],
      ["Advanced Analytics", true],
      ["Resource Allocation", true],
      ["Mobile Accessibility", false],
    ],
  },

  {
    name: "Enterprise",
    tag: "For companies",
    price: "$39",
    features: [
      ["Task Management", true],
      ["Real-time Collaboration", true],
      ["Customizable Dashboards", true],
      ["Advanced Analytics", true],
      ["Resource Allocation", true],
      ["Mobile Accessibility", true],
    ],
  },
];


export default function PricingSection() {
  return (

<section
id="pricing"
className="bg-white px-6 py-24 text-[#111]"
>

<div className="mx-auto max-w-[1180px]">


{/* Header */}

<div className="flex flex-col gap-8 md:flex-row md:items-end md:justify-between">


<div>

<span className="
inline-flex
rounded-full
border
border-black/10
px-4
py-1.5
text-xs
tracking-widest
">
PRICING PLAN
</span>


<h2 className="
mt-6
text-[44px]
font-semibold
leading-[1.1]
tracking-[-0.05em]
md:text-[58px]
">
Effortless Project Tracking
</h2>


<p className="
mt-4
max-w-[520px]
text-lg
text-black/60
">
Easily monitor the progress of your projects with intuitive
dashboards and real-time updates.
</p>


</div>




{/* Toggle */}

<div className="
flex
rounded-full
border
border-black/10
p-1
">

<button className="
rounded-full
px-7
py-3
text-sm
text-black/70
">
Monthly
</button>


<button className="
rounded-full
bg-[#111]
px-7
py-3
text-sm
text-white
">
Yearly
</button>


</div>


</div>





{/* Cards */}

<div className="
mt-16
grid
gap-6
lg:grid-cols-3
">


{plans.map((plan)=>(


<div
key={plan.name}
className="
rounded-[26px]
border
border-black/10
bg-white
p-6
"
>


{/* Price */}

<div className="
flex
items-center
justify-between
">

<div>

<h3 className="
text-[26px]
font-semibold
tracking-tight
">
{plan.name}
</h3>


<span className="
mt-2
inline-flex
rounded-full
bg-black/5
px-3
py-1
text-xs
text-black/60
">
{plan.tag}
</span>


</div>



<div className="
text-right
">

<span className="
text-[38px]
font-semibold
tracking-tight
">
{plan.price}
</span>

<span className="
text-black/50
">
 / per month
</span>

</div>


</div>





<p className="
mt-8
text-lg
text-black/60
">
Comprehensive package tailored for growing businesses.
</p>





<button
className={`
mt-8
h-12
w-full
rounded-xl
border
text-sm
font-medium
transition

${
plan.popular
?
"bg-[#111] text-white border-black"
:
"bg-white border-black/10"
}

`}
>

Get started

</button>





{/* Feature box */}

<div className="
mt-6
rounded-[18px]
border
border-black/10
p-5
">


<h4 className="
text-lg
font-medium
">
Features includes:
</h4>



<ul className="
mt-5
space-y-4
">


{plan.features.map(([text,active])=>(

<li
key={text as string}
className="
flex
items-center
gap-3
text-[16px]
"
>


<span
className={`
flex
h-6
w-6
items-center
justify-center
rounded-full

${
active
?
"bg-[#111] text-white"
:
"bg-black/10 text-black/40"
}

`}
>

{
active
?
<Check size={14}/>
:
<X size={14}/>
}

</span>


{text}


</li>


))}


</ul>



</div>



</div>


))}


</div>


</div>

</section>

  );
}