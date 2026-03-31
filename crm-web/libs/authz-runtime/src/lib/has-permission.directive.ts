import {
  Directive,
  EmbeddedViewRef,
  Input,
  OnChanges,
  TemplateRef,
  ViewContainerRef,
  inject,
} from '@angular/core';
import { PermissionKey } from '@srm/authz-core';
import { PermissionsService } from './permissions.service';

@Directive({
  selector: '[appHasPermission]',
  standalone: true,
})
export class HasPermissionDirective implements OnChanges {
  private readonly tpl = inject(TemplateRef<unknown>);
  private readonly vcr = inject(ViewContainerRef);
  private readonly permissions = inject(PermissionsService);
  private viewRef: EmbeddedViewRef<unknown> | null = null;

  @Input('appHasPermission') required: PermissionKey | ReadonlyArray<PermissionKey> = [];
  @Input() appHasPermissionMode: 'all' | 'any' = 'all';

  ngOnChanges(): void {
    this.render();
  }

  private render(): void {
    const list = Array.isArray(this.required) ? this.required : [this.required];
    const allowed =
      this.appHasPermissionMode === 'any'
        ? this.permissions.hasAny(list)
        : list.every((p) => this.permissions.can(p));

    if (allowed && !this.viewRef) {
      this.viewRef = this.vcr.createEmbeddedView(this.tpl);
      return;
    }
    if (!allowed && this.viewRef) {
      this.vcr.clear();
      this.viewRef = null;
    }
  }
}

