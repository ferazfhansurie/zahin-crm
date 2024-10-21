import { type Menu } from "@/stores/menuSlice";

const menu: Array<Menu | "divider"> = [
  {
    icon: "Calendar",
    title: "Dashboard",
   pathname:'/calendar'
  },

  {
    icon: "HardDrive",
    pathname: "/crud-data-list",
    title: "Contacts",
  },

  /* {
    icon: "Bot",
    pathname: "/dashboard/inbox",
    title: "Assistant",
  },
 {
    icon: "HardDrive",
    pathname: "/dashboard/file-manager",
    title: "File Manager",
  },
  {
    icon: "Calendar",
    pathname: "/dashboard/calendar",
    title: "Calendar",
  },*/
  "divider",
  {
    icon: "Users",
    title: "Users",
    pathname: "users-layout-2",
  },

];

export default menu;
