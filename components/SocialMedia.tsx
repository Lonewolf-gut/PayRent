
import React from 'react'
import Link from 'next/link'
import { FaGithub, FaFacebook, FaLinkedin, FaSlack } from 'react-icons/fa6';
import { TooltipProvider, TooltipTrigger,Tooltip, TooltipContent } from "@radix-ui/react-tooltip";
import { cn } from '@/lib/utils'

interface Props{
    className?: string;
    iconClassName?: string;
    tooltipClassName?: string;
}
 const socialLink = [
  {
    title: "GitHub",
    href: "https://github.com",
    icon: FaGithub,
  },
  {
    title: "LinkedIn",
    href: "https://linkedin.com",
    icon: FaLinkedin,
  },
  {
    title: "Facebook",
    href: "https://facebook.com",
    icon: FaFacebook,
  },
  {
    title: "Slack",
    href: "https://slack.com",
    icon: FaSlack,
  },
];
const SocialMedia = ({ className, iconClassName, tooltipClassName }: Props) => {
  return (
    <TooltipProvider>
      <div className={cn( "flex items-center gap-3.5", className)}>
        {socialLink?.map((item) => {
          const Icon = item.icon;

          return (
            <Tooltip key={item?.title}>
              <TooltipTrigger asChild>
                <Link href={item?.href} target="_blank" rel="noopener noreferrer" className={cn( "p-2 border rounded-full hover:text-white hover:border-shop_light_green hoverEffect", className)}>
                  <Icon className="h-5 w-5" />
                </Link>
              </TooltipTrigger>
              <TooltipContent className={cn("bg-white text-darkColor border border-shop_light_green font-semibold", tooltipClassName)}>
                    {item?.title}
              </TooltipContent>
            
            </Tooltip>
          );
        })}
      </div>
    </TooltipProvider>
  );
};

export default SocialMedia
