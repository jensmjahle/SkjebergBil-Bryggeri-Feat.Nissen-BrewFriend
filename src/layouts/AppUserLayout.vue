<template>
  <div class="flex min-h-screen flex-col gap-4">
    <UserNavBar />
    <div class="flex flex-grow align-middle justify-center flex-1">
      <router-view />
    </div>
    <Footer />
  </div>
</template>

<script setup>
import UserNavBar from "@/components/navigation/UserNavBar.vue";
import Footer from "@/components/Footer.vue";
</script>
