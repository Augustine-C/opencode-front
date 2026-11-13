import type { JSX } from "solid-js"
import "./sidebar-layout.css"

// The titlebar retains ownership of native commands and macOS window-control clearance.
export function SidebarToolbar(props: {
  home: JSX.Element
  search: JSX.Element
  toggle: JSX.Element
  menu?: JSX.Element
}) {
  return (
    <div data-slot="sidebar-toolbar" class="[app-region:no-drag]">
      {props.menu}
      {props.toggle}
      {props.home}
      <div data-slot="sidebar-toolbar-search">{props.search}</div>
    </div>
  )
}
