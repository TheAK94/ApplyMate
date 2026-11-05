
chrome.runtime.onInstalled.addListener(() => {
  console.log("ApplyMate installed!");
});

chrome.sidePanel.setPanelBehavior({
  openPanelOnActionClick: true,
});
