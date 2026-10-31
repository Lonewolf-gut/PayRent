import { cn } from '@/lib/utils'
import  Link  from 'next/link'
import React from 'react'

function Logo({className,spanDesign}:{className?:string,spanDesign?:string}) {
  return (
    <Link href={"/"}><h2 className={cn("text-2xl font-black text-shop_dardk_green  tracking-wider uppercase hover:text-shop_light_green  hoverEffect group font-sans", className)}>Shorpcar<span className={cn("text-shop_light_green group-hover:text-shop_dardk_green hoverEffect",spanDesign)}>t</span></h2></Link>
  )
}
 
export default Logo
