import NProgress from 'nprogress'

// ナビゲーション用のローディング状態管理
class NavigationLoader {
  private isLoading = false

  start() {
    if (!this.isLoading) {
      this.isLoading = true
      NProgress.start()
    }
  }

  done() {
    if (this.isLoading) {
      this.isLoading = false
      NProgress.done()
    }
  }

  getStatus() {
    return this.isLoading
  }
}

export const navigationLoader = new NavigationLoader()