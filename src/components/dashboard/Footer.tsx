import Link from "next/link";
import { FaFacebookF, FaInstagram, FaXTwitter, FaLinkedinIn } from "react-icons/fa6";


const productLinks = [
  { name: "Features", href: "/#features" },
  { name: "Workflow", href: "/#workflow" },
  { name: "Integrations", href: "/#tools" },
  { name: "Pricing", href: "/#pricing" },
  { name: "Updates", href: "/changelog" },
];


const resourceLinks = [
  { name: "Blog", href: "/blog" },
  { name: "Help Center", href: "/help" },
  { name: "Documentation", href: "/docs" },
  { name: "API Reference", href: "/api" },
];


const companyLinks = [
  { name: "About", href: "/about" },
  { name: "Careers", href: "/careers" },
  { name: "Contact", href: "/contact" },
  { name: "Security", href: "/security" },
];



export default function Footer() {

return (

<footer className="
bg-white
px-6
pb-8
pt-28
text-[#111]
">


<div className="
mx-auto
max-w-[1180px]
">


<div className="
grid
gap-14
lg:grid-cols-[1.2fr_2fr]
">



{/* Brand */}

<div>


<Link
href="/"
className="
flex
items-center
gap-3
text-2xl
font-semibold
tracking-tight
"
>


{/* Omniwork SVG Logo */}

<svg
width="30"
height="30"
viewBox="0 0 30 30"
fill="none"
>

<rect
width="30"
height="30"
rx="8"
fill="#111"
/>


<path
d="M9 15C9 11.6863 11.6863 9 15 9C18.3137 9 21 11.6863 21 15"
stroke="white"
strokeWidth="2"
strokeLinecap="round"
/>


<circle
cx="15"
cy="15"
r="2"
fill="white"
/>


</svg>


Omniwork


</Link>




<p className="
mt-6
max-w-[380px]
text-lg
leading-relaxed
text-black/60
">

The all-in-one workspace to manage projects,
collaborate with your team, and improve productivity.

</p>



</div>






{/* Links */}

<div className="
grid
gap-10
sm:grid-cols-3
">


{[
["Product",productLinks],
["Resources",resourceLinks],
["Company",companyLinks]

].map(([title,links])=>(


<div key={title as string}>


<h3 className="
text-sm
font-semibold
uppercase
tracking-widest
text-black/50
">

{title as string}

</h3>



<ul className="
mt-6
space-y-4
">


{(links as {
name:string;
href:string
}[]).map((item)=>(


<li key={item.name}>

<Link
href={item.href}
className="
text-[15px]
text-black/70
hover:text-black
transition
"
>

{item.name}

</Link>


</li>


))}


</ul>


</div>


))}


</div>



</div>






{/* Bottom */}

<div className="
mt-20
flex
flex-col
gap-5
rounded-[20px]
border
border-black/10
bg-[#faf9f6]
px-6
py-5
md:flex-row
md:items-center
md:justify-between
">



<p className="
text-sm
text-black/60
">

© 2026 Omniwork. All rights reserved.

</p>



<div className="
flex
items-center
gap-5
">


<FaFacebookF size={17}/>

<FaXTwitter size={17}/>

<FaLinkedinIn size={18}/>

<FaInstagram size={18}/>


</div>



<div className="
flex
gap-6
text-sm
text-black/60
">

<Link href="/privacy-policy">
Privacy Policy
</Link>


<Link href="/terms">
Terms & Conditions
</Link>


</div>



</div>



</div>


</footer>


);

}