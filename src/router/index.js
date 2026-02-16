import { createRouter, createWebHistory } from "vue-router";
import { parseJwt } from "../utils/jwt";

import AppUserLayout from "../layouts/AppUserLayout.vue";
import AppAdminLayout from "@/layouts/AppAdminLayout.vue";

import HomeView from "../views/User/HomeView.vue";
import SectionPlaceholderView from "@/views/User/SectionPlaceholderView.vue";
import CreateNewRecipeView from "@/views/User/CreateNewRecipeView.vue";
import RecipesView from "@/views/User/RecipesView.vue";
import RecipeDetailView from "@/views/User/RecipeDetailView.vue";
import EditRecipeView from "@/views/User/EditRecipeView.vue";
import ToolsView from "@/views/User/ToolsView.vue";

import AdminLoginView from "@/views/Admin/AdminLoginView.vue";
import AdminHomeView from "@/views/Admin/AdminHomeView.vue";
import AllEventsView from "@/views/Admin/AllEventsView.vue";
import NewEventView from "@/views/Admin/NewEventView.vue";
import AdminEventView from "@/views/Admin/AdminEventView.vue";

const routes = [
  {
    path: "/",
    component: AppUserLayout,
    children: [
      {
        path: "",
        name: "home",
        component: HomeView,
      },
      {
        path: "event/:eventId",
        name: "event",
        component: SectionPlaceholderView,
        props: {
          title: "Event",
          description: "Eventdetaljer er midlertidig utilgjengelig i denne versjonen.",
        },
      },
      {
        path: "brygg/nytt",
        name: "brygg-nytt",
        component: SectionPlaceholderView,
        props: {
          title: "Nytt Brygg",
          description: "Opprett et nytt brygg.",
        },
      },
      {
        path: "brygg/tidligere",
        name: "brygg-tidligere",
        component: SectionPlaceholderView,
        props: {
          title: "Tidligere Brygg",
          description: "Se tidligere brygg.",
        },
      },
      {
        path: "oppskrifter/ny",
        name: "oppskrift-ny",
        component: CreateNewRecipeView,
      },
      {
        path: "oppskrifter",
        name: "oppskrifter",
        component: RecipesView,
      },
      {
        path: "oppskrifter/tidligere",
        redirect: "/oppskrifter",
      },
      {
        path: "oppskrifter/:recipeId",
        name: "oppskrift-detalj",
        component: RecipeDetailView,
        props: true,
      },
      {
        path: "oppskrifter/:recipeId/rediger",
        name: "oppskrift-rediger",
        component: EditRecipeView,
        props: true,
      },
      {
        path: "verktoy/alkoholmaler",
        name: "verktoy-alkoholmaler",
        component: ToolsView,
        props: { initialTool: "alcohol" },
      },
      {
        path: "verktoy/co2-volumer",
        name: "verktoy-co2-volumer",
        component: ToolsView,
        props: { initialTool: "co2" },
      },
      {
        path: "verktoy/hydrometer-korrigering",
        name: "verktoy-hydrometer-korrigering",
        component: ToolsView,
        props: { initialTool: "hydrometer" },
      },
    ],
  },
  {
    path: "/admin",
    component: AppAdminLayout,
    meta: { requiresAdmin: true },
    children: [
      {
        path: "",
        name: "admin-home",
        component: AdminHomeView,
      },
      {
        path: "events/new",
        name: "event-new",
        component: NewEventView,
      },
      {
        path: "events",
        name: "admin-events",
        component: AllEventsView,
      },
      {
        path: "events/:eventId",
        name: "admin-event",
        component: AdminEventView,
        props: true,
      },
    ],
  },
  {
    path: "/admin/login",
    name: "admin-login",
    component: AdminLoginView,
  },
  {
    path: "/:pathMatch(.*)*",
    redirect: "/",
  },
];

const router = createRouter({
  history: createWebHistory(),
  routes,
});

router.beforeEach((to, from, next) => {
  const token = sessionStorage.getItem("jwt");
  const decoded = token ? parseJwt(token) : null;
  const role = decoded?.role;

  if (to.meta.requiresAdmin) {
    if (!token || (role !== "SUPERUSER" && role !== "MODERATOR")) {
      return next({ name: "admin-login" });
    }
  }

  next();
});

export default router;
export { routes };
