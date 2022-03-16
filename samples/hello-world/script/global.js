const drawerButton = document.querySelector(".drawer-button");
drawerButton.addEventListener("click", () => {
  drawerButton.ariaExpanded =
    drawerButton.ariaExpanded === "true" ? false : true;
});
